"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";

type Milestone = {
  id: string;
  title: string;
  assignee: string | null;
  color: string | null;
  startDate: string | null;
  endDate: string | null;
  priority: string;
  progress: number;
  order: number;
  parentId: string | null;
  projectId: string;
};

type Parent = Milestone & { children: Milestone[] };

const COLORS = [
  { value: "#dbeafe", label: "파랑", bar: "#93c5fd", barText: "#1e40af", border: "#60a5fa" },
  { value: "#fef9c3", label: "노랑", bar: "#fde68a", barText: "#854d0e", border: "#fbbf24" },
  { value: "#dcfce7", label: "초록", bar: "#86efac", barText: "#166534", border: "#4ade80" },
  { value: "#fce7f3", label: "분홍", bar: "#f9a8d4", barText: "#9d174d", border: "#f472b6" },
  { value: "#f3e8ff", label: "보라", bar: "#c4b5fd", barText: "#5b21b6", border: "#a78bfa" },
  { value: "#e0e7ff", label: "남색", bar: "#a5b4fc", barText: "#3730a3", border: "#818cf8" },
  { value: "#ffedd5", label: "주황", bar: "#fdba74", barText: "#9a3412", border: "#fb923c" },
];

function getColorSet(color: string | null) {
  return COLORS.find((c) => c.value === color) ?? COLORS[0];
}

function parseDate(s: string) { return new Date(s + "T00:00:00"); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function formatMD(d: Date) { return `${d.getMonth() + 1}/${d.getDate()}`; }
function diffDays(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

type WeekCol = { start: Date; label: string; month: number };
type MonthGroup = { label: string; weeks: number };

function formatWeekRange(mon: Date) {
  const fri = addDays(mon, 4);
  return `${mon.getDate()}~${fri.getDate()}`;
}

function generateWeeks(s: Date, e: Date): WeekCol[] {
  const weeks: WeekCol[] = [];
  let cur = startOfWeek(s);
  while (cur <= e) {
    weeks.push({ start: new Date(cur), label: formatWeekRange(cur), month: cur.getMonth() });
    cur = addDays(cur, 7);
  }
  return weeks;
}

function groupByMonth(weeks: WeekCol[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  weeks.forEach((w) => {
    const label = `${w.month + 1}월`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.weeks++;
    else groups.push({ label, weeks: 1 });
  });
  return groups;
}

const PRIORITY_ORDER: Record<string, number> = { "상": 0, "중": 1, "하": 2 };

function assignLanes(children: Milestone[]): { milestone: Milestone; lane: number }[] {
  const sorted = [...children]
    .filter((c) => c.startDate && c.endDate)
    .sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
      || a.startDate!.localeCompare(b.startDate!)
      || a.order - b.order
    );
  const lanes: string[][] = [];
  const result: { milestone: Milestone; lane: number }[] = [];
  for (const m of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      const lastEnd = lanes[i][lanes[i].length - 1];
      if (m.startDate! > lastEnd) {
        lanes[i].push(m.endDate!);
        result.push({ milestone: m, lane: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([m.endDate!]);
      result.push({ milestone: m, lane: lanes.length - 1 });
    }
  }
  return result;
}

const BAR_HEIGHT = 22;
const BAR_GAP = 4;
const LANE_HEIGHT = BAR_HEIGHT + BAR_GAP;
const CATEGORY_PADDING = 8;
const LEFT_WIDTH = 160;

type DragState = {
  id: string;
  mode: "move" | "resize-left" | "resize-right";
  origStartDate: string;
  origEndDate: string;
  startX: number;
} | null;

export function MilestoneList({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("중");
  const [progress, setProgress] = useState(0);
  const [parentId, setParentId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  // 드래그 상태
  const dragState = useRef<DragState>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; startDate: string; endDate: string } | null>(null);

  const load = () => {
    fetch(`/api/milestones?projectId=${projectId}`).then((r) => r.json()).then(setMilestones);
  };
  useEffect(() => { load(); }, [projectId]);

  const parents: Parent[] = useMemo(() => {
    const roots = milestones.filter((m) => !m.parentId).sort((a, b) => a.order - b.order);
    return roots.map((root) => ({
      ...root,
      children: milestones.filter((m) => m.parentId === root.id).sort((a, b) => a.order - b.order),
    }));
  }, [milestones]);

  const roots = parents;

  const categoryData = useMemo(() => {
    return parents.map((p) => {
      const laneItems = assignLanes(p.children);
      const laneCount = laneItems.length > 0 ? Math.max(...laneItems.map((l) => l.lane)) + 1 : 1;
      return { parent: p, laneItems, laneCount };
    });
  }, [parents]);

  const { weeks, months, rangeStart } = useMemo(() => {
    const year = new Date().getFullYear();
    const rStart = parseDate(`${year}-03-03`);
    const rEnd = parseDate(`${year}-07-31`);
    const weeks = generateWeeks(rStart, rEnd);
    const months = groupByMonth(weeks);
    return { weeks, months, rangeStart: weeks[0]?.start ?? new Date() };
  }, []);

  const totalDays = weeks.length * 7;

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayRef.current.offsetLeft - 200);
    }
  }, [weeks]);

  const handleScroll = (source: "left" | "right") => {
    const l = leftRef.current;
    const r = scrollRef.current;
    if (!l || !r) return;
    if (source === "right") l.scrollTop = r.scrollTop;
    else r.scrollTop = l.scrollTop;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPct = (diffDays(rangeStart, today) / totalDays) * 100;

  // px → 일수 변환
  const pxToDays = useCallback((px: number) => {
    const ganttWidth = ganttRef.current?.clientWidth ?? 1;
    return Math.round((px / ganttWidth) * totalDays);
  }, [totalDays]);

  const getBarPos = useCallback((m: Milestone | { startDate: string; endDate: string }) => {
    const sd = "startDate" in m ? m.startDate : null;
    const ed = "endDate" in m ? m.endDate : null;
    if (!sd || !ed) return null;
    const s = parseDate(sd);
    const e = parseDate(ed);
    const left = (diffDays(rangeStart, s) / totalDays) * 100;
    const width = Math.max(0.5, ((diffDays(s, e) + 1) / totalDays) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }, [rangeStart, totalDays]);

  const getRowHeight = (laneCount: number) => laneCount * LANE_HEIGHT + CATEGORY_PADDING * 2;

  // --- 드래그 핸들러 ---
  const handleDragStart = (e: React.MouseEvent, id: string, mode: DragState["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    const m = milestones.find((x) => x.id === id);
    if (!m || !m.startDate || !m.endDate) return;
    dragState.current = {
      id,
      mode: mode!,
      origStartDate: m.startDate,
      origEndDate: m.endDate,
      startX: e.clientX,
    };
    setDragPreview({ id, startDate: m.startDate, endDate: m.endDate });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const daysDelta = pxToDays(dx);
    if (daysDelta === 0 && !dragPreview) return;

    const origStart = parseDate(ds.origStartDate);
    const origEnd = parseDate(ds.origEndDate);

    let newStart: Date, newEnd: Date;
    if (ds.mode === "move") {
      newStart = addDays(origStart, daysDelta);
      newEnd = addDays(origEnd, daysDelta);
    } else if (ds.mode === "resize-left") {
      newStart = addDays(origStart, daysDelta);
      newEnd = origEnd;
      if (newStart > newEnd) newStart = newEnd;
    } else {
      newStart = origStart;
      newEnd = addDays(origEnd, daysDelta);
      if (newEnd < newStart) newEnd = newStart;
    }

    setDragPreview({ id: ds.id, startDate: toDateStr(newStart), endDate: toDateStr(newEnd) });
  }, [pxToDays, dragPreview]);

  const handleMouseUp = useCallback(async () => {
    const ds = dragState.current;
    const preview = dragPreview;
    dragState.current = null;
    setDragPreview(null);
    if (!ds || !preview) return;
    if (preview.startDate === ds.origStartDate && preview.endDate === ds.origEndDate) return;

    // 낙관적 업데이트
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === ds.id ? { ...m, startDate: preview.startDate, endDate: preview.endDate } : m
      )
    );

    await fetch(`/api/milestones/${ds.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: preview.startDate, endDate: preview.endDate }),
    });
  }, [dragPreview]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 드래그 중 미리보기 날짜를 반영한 milestone
  const getDisplayMilestone = (m: Milestone) => {
    if (dragPreview && dragPreview.id === m.id) {
      return { ...m, startDate: dragPreview.startDate, endDate: dragPreview.endDate };
    }
    return m;
  };

  const openCreate = (forParentId?: string, defaultStart?: string, defaultEnd?: string) => {
    setEditing(null);
    setTitle(""); setAssignee(""); setColor(COLORS[0].value);
    setStartDate(defaultStart ?? ""); setEndDate(defaultEnd ?? ""); setPriority("중"); setProgress(0);
    setParentId(forParentId ?? "");
    setModalOpen(true);
  };

  const handleGanttRowClick = (e: React.MouseEvent, parentId: string) => {
    if (dragState.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const dayOffset = Math.round(pct * totalDays);
    const clickedDate = addDays(rangeStart, dayOffset);
    const start = toDateStr(clickedDate);
    const end = toDateStr(addDays(clickedDate, 13));
    openCreate(parentId, start, end);
  };

  const openEdit = (m: Milestone) => {
    if (dragState.current) return;
    setEditing(m);
    setTitle(m.title); setAssignee(m.assignee ?? ""); setColor(m.color ?? COLORS[0].value);
    setStartDate(m.startDate ?? ""); setEndDate(m.endDate ?? ""); setPriority(m.priority || "중"); setProgress(m.progress);
    setParentId(m.parentId ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      assignee: assignee.trim() || null,
      color: parentId ? null : color,
      startDate: startDate || null,
      endDate: endDate || null,
      priority,
      progress,
      parentId: parentId || null,
    };
    if (editing) {
      await fetch(`/api/milestones/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/milestones", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, projectId }),
      });
    }
    setModalOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/milestones/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  const HEADER_HEIGHT = 56;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{milestones.length}개 항목</span>
        {canEdit && (
          <button onClick={() => openCreate()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 대분류 추가
          </button>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
          <p className="mb-1">등록된 일정이 없습니다</p>
          <p className="text-sm">WBS 항목을 추가해 보세요</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden flex select-none">
          {/* 왼쪽 고정 */}
          <div
            ref={leftRef}
            className="shrink-0 border-r overflow-y-auto"
            style={{ width: LEFT_WIDTH }}
            onScroll={() => handleScroll("left")}
          >
            <div className="border-b bg-gray-50 flex items-center px-3 text-xs font-medium text-gray-500" style={{ height: HEADER_HEIGHT }}>
              WBS 항목
            </div>
            {categoryData.map(({ parent: p, laneCount }) => {
              const cs = getColorSet(p.color);
              const h = getRowHeight(laneCount);
              return (
                <div key={p.id} className="border-b flex items-center px-2 group" style={{ height: h, backgroundColor: cs.value }}>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold truncate" style={{ color: cs.barText }}>{p.title}</span>
                    {p.assignee && <span className="text-[11px] text-gray-500 truncate">{p.assignee}</span>}
                  </div>
                  {canEdit && (
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openCreate(p.id)} className="text-gray-400 hover:text-green-600 text-xs" title="하위 항목 추가">+</button>
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-500 text-[10px]">&#9998;</button>
                      <button onClick={() => setDeleteTarget(p)} className="text-gray-400 hover:text-red-500 text-xs">&times;</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 오른쪽 간트 */}
          <div ref={scrollRef} className="flex-1 overflow-hidden" onScroll={() => handleScroll("right")}>
            <div style={{ width: "100%" }}>
              <div className="flex border-b bg-gray-50" style={{ height: 24 }}>
                {months.map((m, i) => (
                  <div key={i} className="text-center text-sm font-bold text-gray-700 border-r border-gray-200 flex items-center justify-center" style={{ width: `${(m.weeks / weeks.length) * 100}%` }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex border-b bg-gray-50" style={{ height: 32 }}>
                {weeks.map((w, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-600 border-r border-gray-100 flex items-center justify-center" style={{ width: `${100 / weeks.length}%` }}>
                    {w.label}
                  </div>
                ))}
              </div>

              <div className="relative" ref={ganttRef}>
                <div className="absolute inset-0 pointer-events-none">
                  {weeks.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: `${(i / weeks.length) * 100}%` }} />
                  ))}
                </div>

                {todayPct > 0 && todayPct < 100 && (
                  <div ref={todayRef} className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${todayPct}%` }}>
                    <div className="absolute -top-14 -translate-x-1/2 text-[9px] font-bold text-red-500 bg-red-50 px-1 rounded">Today</div>
                    <div className="w-px h-full bg-red-400" />
                  </div>
                )}

                {categoryData.map(({ parent: p, laneItems, laneCount }) => {
                  const cs = getColorSet(p.color);
                  const h = getRowHeight(laneCount);
                  return (
                    <div
                      key={p.id}
                      className={`relative border-b ${canEdit ? "cursor-crosshair" : ""}`}
                      style={{ height: h, backgroundColor: cs.value + "18" }}
                      onClick={canEdit ? (e) => { if (e.target === e.currentTarget) handleGanttRowClick(e, p.id); } : undefined}
                    >
                      {laneItems.map(({ milestone: child, lane }) => {
                        const display = getDisplayMilestone(child);
                        const bar = getBarPos(display);
                        if (!bar) return null;
                        const top = CATEGORY_PADDING + lane * LANE_HEIGHT;
                        const isDragging = dragPreview?.id === child.id;
                        return (
                          <div
                            key={child.id}
                            className={`absolute rounded-sm flex items-center overflow-visible group/bar ${
                              isDragging ? "opacity-80 shadow-lg z-30" : canEdit ? "cursor-pointer" : ""
                            }`}
                            style={{
                              left: bar.left,
                              width: bar.width,
                              top,
                              height: BAR_HEIGHT,
                              backgroundColor: cs.bar,
                              border: `1px solid ${cs.border}`,
                            }}
                            onClick={canEdit ? () => openEdit(child) : undefined}
                          >
                            {/* 왼쪽 리사이즈 핸들 */}
                            {canEdit && (
                              <div
                                className="absolute -left-[3px] top-0 bottom-0 w-[6px] cursor-ew-resize z-10 hover:bg-black/10 rounded-l-sm"
                                onMouseDown={(e) => handleDragStart(e, child.id, "resize-left")}
                              />
                            )}

                            {/* 가운데 이동 영역 */}
                            {canEdit && (
                              <div
                                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => handleDragStart(e, child.id, "move")}
                              />
                            )}

                            {/* 오른쪽 리사이즈 핸들 */}
                            {canEdit && (
                              <div
                                className="absolute -right-[3px] top-0 bottom-0 w-[6px] cursor-ew-resize z-10 hover:bg-black/10 rounded-r-sm"
                                onMouseDown={(e) => handleDragStart(e, child.id, "resize-right")}
                              />
                            )}

                            {/* 진행률 */}
                            {child.progress > 0 && (
                              <div className="absolute inset-y-0 left-0 rounded-l-sm pointer-events-none" style={{ width: `${child.progress}%`, backgroundColor: cs.border, opacity: 0.35 }} />
                            )}

                            {/* 제목 */}
                            <span className="relative z-[5] text-xs font-bold whitespace-nowrap pointer-events-none w-full text-center" style={{ color: cs.barText, textShadow: "0 0 2px rgba(255,255,255,0.6)" }}>
                              {child.title}
                            </span>

                            {/* 삭제 */}
                            {canEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(child); }}
                                className="absolute right-0.5 top-0 text-[10px] opacity-0 group-hover/bar:opacity-100 transition-opacity z-10"
                                style={{ color: cs.barText }}
                              >
                                &times;
                              </button>
                            )}

                            {/* 드래그 중 날짜 툴팁 */}
                            {isDragging && dragPreview && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-40 pointer-events-none">
                                {dragPreview.startDate.slice(5)} ~ {dragPreview.endDate.slice(5)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "항목 수정" : parentId ? "하위 항목 추가" : "대분류 추가"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">분류</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="">대분류 (최상위)</option>
                {roots.map((r) => (<option key={r.id} value={r.id}>{r.title}의 하위</option>))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">항목명</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="항목 이름" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="담당자명" />
          </div>
          {!parentId && !editing?.parentId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c.value ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }} title={c.label} />
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">중요도</label>
            <div className="flex gap-2">
              {(["상", "중", "하"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    priority === p
                      ? p === "상" ? "bg-red-50 border-red-300 text-red-700 font-medium"
                        : p === "중" ? "bg-amber-50 border-amber-300 text-amber-700 font-medium"
                        : "bg-gray-50 border-gray-300 text-gray-700 font-medium"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진행률: {progress}%</label>
            <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? "수정" : "추가"}</button>
          </div>
        </form>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="항목 삭제">
        <p className="text-sm text-gray-600 mb-1"><strong>{deleteTarget?.title}</strong> 항목을 삭제하시겠습니까?</p>
        {!deleteTarget?.parentId && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">하위 항목도 함께 삭제됩니다.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">삭제</button>
        </div>
      </Modal>
    </div>
  );
}
