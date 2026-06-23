"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useCanEdit } from "@/contexts/auth-context";
import type { ActionItem } from "@/types";

const DAY_MS = 86400000;
const STATUS_COLOR: Record<string, string> = {
  "Open": "bg-slate-400",
  "In-Progress": "bg-blue-500",
  "Review": "bg-amber-500",
  "Pending": "bg-orange-500",
  "Closed": "bg-emerald-500",
};

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s.slice(0, 10));
  return isNaN(d.getTime()) ? null : d;
}
function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay() + 1);
  c.setHours(0, 0, 0, 0);
  return c;
}
function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function toISO(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function ActionItemGantt({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const trackRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const filterInit = useRef(false);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/action-items?projectId=${projectId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`/api/milestones/categories?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d); })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (filterInit.current) return;
    const my = (user?.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (my.length === 1) {
      setFilterCategory(my[0]);
      filterInit.current = true;
    } else if (user) {
      filterInit.current = true;
    }
  }, [user]);

  const filteredBase = filterCategory ? items.filter((i) => i.category === filterCategory) : items;
  const filtered = [...filteredBase].sort((a, b) => {
    const keys: Array<keyof ActionItem> = ["category", "requestDate", "startDate", "endDate", "description"];
    for (const k of keys) {
      const av = (a[k] ?? "") as string;
      const bv = (b[k] ?? "") as string;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
  const allCategories = Array.from(new Set([...categories, ...items.map((i) => i.category)].filter(Boolean)));

  const { weeks, totalDays, rangeStart } = useMemo(() => {
    const dates = filtered.flatMap((i) => [parseDate(i.startDate), parseDate(i.endDate)]).filter((d): d is Date => !!d);
    if (dates.length === 0) {
      const now = new Date();
      const s = startOfWeek(now);
      const e = new Date(s); e.setDate(e.getDate() + 28);
      return { weeks: makeWeeks(s, e), totalDays: 28, rangeStart: s };
    }
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const s = startOfWeek(min);
    s.setDate(s.getDate() - 7);
    const e = new Date(max);
    e.setDate(e.getDate() + 14);
    return { weeks: makeWeeks(s, e), totalDays: Math.ceil((e.getTime() - s.getTime()) / DAY_MS), rangeStart: s };
  }, [filtered]);

  function pct(d: Date) {
    return ((d.getTime() - rangeStart.getTime()) / DAY_MS / totalDays) * 100;
  }

  function startDrag(e: React.MouseEvent, item: ActionItem, mode: "move" | "left" | "right") {
    if (!canEdit) return;
    const track = trackRef.current;
    const sd = parseDate(item.startDate);
    const ed = parseDate(item.endDate);
    if (!track || !sd || !ed) return;
    e.preventDefault();
    e.stopPropagation();
    const trackW = track.getBoundingClientRect().width;
    const startX = e.clientX;
    const startDays = Math.round((sd.getTime() - rangeStart.getTime()) / DAY_MS);
    const endDays = Math.round((ed.getTime() - rangeStart.getTime()) / DAY_MS);
    document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";
    document.body.style.userSelect = "none";
    setDraggingId(item.id);

    const onMove = (m: MouseEvent) => {
      const dx = m.clientX - startX;
      const deltaDays = Math.round((dx / trackW) * totalDays);
      let ns = startDays, ne = endDays;
      if (mode === "move") { ns = startDays + deltaDays; ne = endDays + deltaDays; }
      else if (mode === "left") { ns = Math.min(startDays + deltaDays, endDays - 1); }
      else { ne = Math.max(endDays + deltaDays, startDays + 1); }
      const newStart = new Date(rangeStart.getTime() + ns * DAY_MS);
      const newEnd = new Date(rangeStart.getTime() + ne * DAY_MS);
      setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, startDate: toISO(newStart), endDate: toISO(newEnd) } : p));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDraggingId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const latest = (window as unknown as { __ai_latest?: ActionItem[] }).__ai_latest;
      const updated = (latest ?? itemsRef.current).find((p) => p.id === item.id);
      if (updated) {
        fetch(`/api/action-items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: updated.startDate, endDate: updated.endDate }),
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  const itemsRef = useRef<ActionItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
    (window as unknown as { __ai_latest?: ActionItem[] }).__ai_latest = items;
  }, [items]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPct = today >= rangeStart && pct(today) <= 100 ? pct(today) : null;

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">과제:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">전체</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="text-xs text-gray-400">총 {filtered.length}건</div>
      </div>

      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex">
          <div className="w-80 shrink-0 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="h-12 px-3 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
              <span>Action Item</span>
              <span className="text-[10px] text-gray-400">시작 ~ 종료</span>
            </div>
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-gray-400 text-sm">표시할 항목이 없습니다.</div>
            )}
            {filtered.map((i) => {
              const firstLine = i.description.split("\n")[0] ?? "";
              return (
                <div key={i.id} className="h-10 px-3 flex items-center gap-2 border-b dark:border-gray-700/60 last:border-b-0" title={i.description}>
                  <div className="flex-1 min-w-0">
                    {i.category && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-none">{i.category}</div>
                    )}
                    <div className="text-sm text-gray-700 dark:text-gray-200 truncate leading-snug">
                      {firstLine || <span className="text-gray-300">(설명 없음)</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap shrink-0">
                    {i.startDate?.slice(5, 10) ?? "--"} ~ {i.endDate?.slice(5, 10) ?? "--"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-x-auto relative">
            <div style={{ minWidth: Math.max(weeks.length * 60, 600) }}>
              <div className="h-12 flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {weeks.map((w, idx) => {
                  const end = new Date(w);
                  end.setDate(end.getDate() + 6);
                  return (
                    <div
                      key={idx}
                      className="border-r dark:border-gray-700/60 last:border-r-0 flex flex-col items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 px-1"
                      style={{ width: `${(7 / totalDays) * 100}%` }}
                    >
                      <span className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{fmtMD(w)} ~ {fmtMD(end)}</span>
                      <span>W{getWeekOfMonth(w)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="relative" ref={trackRef}>
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }}
                    title="오늘"
                  >
                    <span className="absolute -top-3 -left-3 text-[9px] text-red-500 font-semibold bg-white dark:bg-gray-800 px-1">TODAY</span>
                  </div>
                )}
                {filtered.map((i) => {
                  const sd = parseDate(i.startDate);
                  const ed = parseDate(i.endDate);
                  if (!sd || !ed) {
                    return <div key={i.id} className="h-10 border-b dark:border-gray-700/60 last:border-b-0" />;
                  }
                  const left = pct(sd);
                  const width = Math.max(pct(ed) - left, 1.5);
                  return (
                    <div key={i.id} className="h-10 relative border-b dark:border-gray-700/60 last:border-b-0">
                      {draggingId === i.id && (
                        <div
                          className="absolute -top-5 z-20 px-2 py-0.5 text-[10px] font-semibold text-white bg-gray-800 dark:bg-gray-100 dark:text-gray-900 rounded shadow-md whitespace-nowrap tabular-nums pointer-events-none"
                          style={{ left: `${left}%` }}
                        >
                          {i.startDate?.slice(5, 10)} ~ {i.endDate?.slice(5, 10)}
                        </div>
                      )}
                      <div
                        onMouseDown={(e) => startDrag(e, i, "move")}
                        className={`absolute top-1/2 -translate-y-1/2 h-5 rounded ${STATUS_COLOR[i.status] ?? "bg-gray-400"} bg-opacity-30 dark:bg-opacity-40 overflow-hidden ${canEdit ? "cursor-grab active:cursor-grabbing" : ""} group`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${i.description} (${i.startDate?.slice(5,10)} ~ ${i.endDate?.slice(5,10)}, ${i.progress}%)`}
                      >
                        <div
                          className={`h-full ${STATUS_COLOR[i.status] ?? "bg-gray-500"} pointer-events-none`}
                          style={{ width: `${i.progress}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-700 dark:text-gray-100 px-2 truncate pointer-events-none">
                          {i.progress}%
                        </span>
                        {canEdit && (
                          <>
                            <div
                              onMouseDown={(e) => startDrag(e, i, "left")}
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30"
                            />
                            <div
                              onMouseDown={(e) => startDrag(e, i, "right")}
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30"
                            />
                          </>
                        )}
                      </div>
                      {i.assignee && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap pointer-events-none pl-1.5"
                          style={{ left: `${left + width}%` }}
                        >
                          {i.assignee}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        {Object.entries(STATUS_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${v}`} /> {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function makeWeeks(start: Date, end: Date) {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}
function getWeekOfMonth(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + first.getDay()) / 7);
}
