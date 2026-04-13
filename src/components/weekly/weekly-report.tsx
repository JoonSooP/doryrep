"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";
import * as XLSX from "xlsx";
import type { Issue } from "@/types";

type MilestoneRef = { id: string; title: string; color: string | null };

type WeeklyEntry = {
  id: string;
  lastWeek: string;
  thisWeek: string;
  issues: string;
  issueIds: string;
  milestone: MilestoneRef;
};

type Report = {
  id: string;
  weekDate: string;
  weekLabel: string;
  entries: WeeklyEntry[];
};

type ParentMilestone = { id: string; title: string; color: string | null; order: number };

const COLORS: Record<string, { bg: string; text: string }> = {
  "#dbeafe": { bg: "#dbeafe", text: "#1e40af" },
  "#fef9c3": { bg: "#fef9c3", text: "#854d0e" },
  "#dcfce7": { bg: "#dcfce7", text: "#166534" },
  "#fce7f3": { bg: "#fce7f3", text: "#9d174d" },
  "#f3e8ff": { bg: "#f3e8ff", text: "#5b21b6" },
  "#e0e7ff": { bg: "#e0e7ff", text: "#3730a3" },
  "#ffedd5": { bg: "#ffedd5", text: "#9a3412" },
};

function getColor(c: string | null) {
  return COLORS[c ?? ""] ?? { bg: "#f3f4f6", text: "#374151" };
}

// ── 이슈ID 링크 + 호버 팝업 ──

function IssueIdDisplay({
  issueIds,
  issueMap,
  onNavigateToIssue,
}: {
  issueIds: string;
  issueMap: Map<string, Issue>;
  onNavigateToIssue: () => void;
}) {
  const ids = issueIds.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return <span className="text-gray-400 text-sm">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((code, i) => {
        const issue = issueMap.get(code);
        return (
          <span key={i} className="relative group/tip">
            <button
              onClick={onNavigateToIssue}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm cursor-pointer"
            >
              {code}
            </button>
            {issue && (
              <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover/tip:block w-72 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl p-3 text-left">
                <div className="text-xs text-gray-400 mb-1">{issue.issueCode} · {issue.issueType} · {issue.status}</div>
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{issue.description}</div>
                {issue.result && (
                  <div className="mt-1 pt-1 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{issue.result}</div>
                )}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function WeeklyReport({ projectId, onNavigateToIssue }: { projectId: string; onNavigateToIssue?: () => void }) {
  const canEdit = useCanEdit();
  const [reports, setReports] = useState<Report[]>([]);
  const [parents, setParents] = useState<ParentMilestone[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [weekDate, setWeekDate] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // 이슈 데이터
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [issuePickerOpen, setIssuePickerOpen] = useState(false);
  const [pickerEntryId, setPickerEntryId] = useState("");
  const [pickerCurrentIds, setPickerCurrentIds] = useState<string[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  const issueMap = useMemo(() => {
    const m = new Map<string, Issue>();
    for (const issue of allIssues) m.set(issue.issueCode, issue);
    return m;
  }, [allIssues]);

  const load = () => {
    fetch(`/api/weekly?projectId=${projectId}`).then((r) => r.json()).then(setReports);
  };

  const loadParents = () => {
    fetch(`/api/milestones?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: ParentMilestone[]) => {
        const roots = data.filter((m: any) => !m.parentId).sort((a, b) => a.order - b.order);
        setParents(roots);
        setExpandedCategories((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const collapsed: Record<string, boolean> = {};
          roots.forEach((r) => { collapsed[r.id] = false; });
          return collapsed;
        });
      });
  };

  const loadIssues = () => {
    fetch(`/api/issues?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllIssues(data); });
  };

  useEffect(() => { load(); loadParents(); loadIssues(); }, [projectId]);

  const categoryWeeklies = useMemo(() => {
    return parents.map((parent) => {
      const cs = getColor(parent.color);
      const weeklyRows = reports
        .map((report) => {
          const entry = report.entries.find((e) => e.milestone.id === parent.id);
          return entry ? { report, entry } : null;
        })
        .filter(Boolean) as { report: Report; entry: WeeklyEntry }[];

      weeklyRows.sort((a, b) =>
        sortOrder === "desc"
          ? b.report.weekDate.localeCompare(a.report.weekDate)
          : a.report.weekDate.localeCompare(b.report.weekDate)
      );

      return { parent, cs, weeklyRows };
    });
  }, [parents, reports, sortOrder]);

  const getNextThursday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day <= 4 ? 4 - day : 7 - day + 4;
    const thu = new Date(now);
    thu.setDate(thu.getDate() + diff);
    return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, "0")}-${String(thu.getDate()).padStart(2, "0")}`;
  };

  const getNextWeekLabel = () => {
    const allLabels = reports.map((r) => r.weekLabel).filter((l) => /^\d+W$/.test(l));
    if (allLabels.length === 0) return "1W";
    const nums = allLabels.map((l) => parseInt(l));
    return `${Math.max(...nums) + 1}W`;
  };

  const openCreateModal = () => {
    setWeekDate(getNextThursday());
    setWeekLabel(getNextWeekLabel());
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekDate || !weekLabel.trim()) return;
    await fetch("/api/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, weekDate, weekLabel: weekLabel.trim() }),
    });
    setCreateOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/weekly/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  const handleEntryChange = (entryId: string, field: string, value: string) => {
    setReports((prev) =>
      prev.map((r) => ({
        ...r,
        entries: r.entries.map((e) =>
          e.id === entryId ? { ...e, [field]: value } : e
        ),
      }))
    );

    if (debounceTimers.current[entryId]) clearTimeout(debounceTimers.current[entryId]);
    debounceTimers.current[entryId] = setTimeout(async () => {
      await fetch(`/api/weekly-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    }, 500);
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── 이슈 선택 picker ──
  const openIssuePicker = (entryId: string, currentIssueIds: string) => {
    const currentIds = currentIssueIds.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    setPickerEntryId(entryId);
    setPickerCurrentIds(currentIds);
    setPickerSelected(new Set(currentIds));
    setIssuePickerOpen(true);
  };

  const toggleIssueSelection = (code: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const confirmIssuePicker = () => {
    const newValue = Array.from(pickerSelected).join(", ");
    handleEntryChange(pickerEntryId, "issueIds", newValue);
    setIssuePickerOpen(false);
  };

  // ── Excel 내려받기 (과제별 시트) ──
  const exportToExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    let hasData = false;

    for (const { parent, weeklyRows } of categoryWeeklies) {
      if (weeklyRows.length === 0) continue;
      hasData = true;
      const rows = weeklyRows.map(({ report, entry }) => ({
        "미팅일": report.weekDate,
        "주차": report.weekLabel,
        "지난주 실적": entry.lastWeek,
        "이번주 계획": entry.thisWeek,
        "이슈/협의필요": entry.issues,
        "이슈관리 ID": entry.issueIds,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 6 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 18 }];
      // 시트명은 31자 제한, 특수문자 제거
      const sheetName = parent.title.replace(/[\\/*?[\]:]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (!hasData) { alert("내려받을 데이터가 없습니다."); return; }
    XLSX.writeFile(wb, `주간보고_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [categoryWeeklies]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{reports.length}개 주차</span>
        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <button
              onClick={exportToExcel}
              className="px-3 py-1.5 border dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Excel 내려받기
            </button>
          )}
          {canEdit && reports.length > 0 && (
            <select
              onChange={(e) => {
                const r = reports.find((r) => r.id === e.target.value);
                if (r) setDeleteTarget(r);
                e.target.value = "";
              }}
              value=""
              className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value="">주차 삭제</option>
              {[...reports].sort((a, b) => a.weekDate.localeCompare(b.weekDate)).map((r) => (
                <option key={r.id} value={r.id}>{r.weekDate} ({r.weekLabel})</option>
              ))}
            </select>
          )}
          {canEdit && (
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + 주차 추가
            </button>
          )}
        </div>
      </div>

      {parents.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="mb-1">과제가 없습니다</p>
          <p className="text-sm">프로젝트 일정에서 과제를 먼저 추가해 주세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryWeeklies.map(({ parent, cs, weeklyRows }) => {
            const isExpanded = expandedCategories[parent.id] ?? false;
            return (
              <div key={parent.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(parent.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ backgroundColor: cs.bg }}
                >
                  <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                  <span className="font-bold text-sm" style={{ color: cs.text }}>
                    {parent.title}
                  </span>
                  <span className="text-xs text-gray-400">{weeklyRows.length}개 주차</span>
                </button>

                {isExpanded && (
                  weeklyRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border-t dark:border-gray-700">
                      등록된 주간 보고가 없습니다. 주차를 추가해 주세요.
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse border-t dark:border-gray-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          <th className="px-3 py-2 font-semibold text-left w-32 border-r cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}>
                            미팅일 {sortOrder === "desc" ? "▼" : "▲"}
                          </th>
                          <th className="px-3 py-2 font-semibold text-left w-14 border-r cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}>
                            주차{sortOrder === "desc" ? "▼" : "▲"}
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r">
                            <span className="text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded text-sm font-bold">지난주 실적</span>
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r">
                            <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded text-sm font-bold">이번주 계획</span>
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r w-36">이슈/협의필요</th>
                          <th className="px-3 py-2 font-semibold text-left w-48 whitespace-nowrap">이슈관리 ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyRows.map(({ report, entry }) => (
                          <tr key={entry.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                            <td className="px-3 py-2 border-r dark:border-gray-700 align-top text-gray-700 dark:text-gray-300">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium whitespace-nowrap">{report.weekDate}</span>
                                {canEdit && (
                                  <button onClick={() => setDeleteTarget(report)} className="text-gray-300 hover:text-red-500 text-base w-6 h-6 flex items-center justify-center rounded hover:bg-red-50">&times;</button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r dark:border-gray-700 align-top font-semibold text-gray-700 dark:text-gray-300 text-sm">
                              {report.weekLabel}
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.lastWeek}
                                onChange={(e) => handleEntryChange(entry.id, "lastWeek", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-sm text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[220px] ${canEdit ? "focus:bg-yellow-50" : "cursor-default"}`}
                                placeholder="· 실적 내용"
                              />
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.thisWeek}
                                onChange={(e) => handleEntryChange(entry.id, "thisWeek", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-sm text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[220px] ${canEdit ? "focus:bg-green-50" : "cursor-default"}`}
                                placeholder="· 계획 내용"
                              />
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.issues}
                                onChange={(e) => handleEntryChange(entry.id, "issues", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-sm text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[220px] ${canEdit ? "focus:bg-red-50" : "cursor-default"}`}
                                placeholder="· 이슈 내용"
                              />
                            </td>
                            <td className="px-1 py-1 align-top">
                              <div className="p-1.5 min-h-[220px]">
                                <IssueIdDisplay
                                  issueIds={entry.issueIds}
                                  issueMap={issueMap}
                                  onNavigateToIssue={onNavigateToIssue ?? (() => {})}
                                />
                                {canEdit && (
                                  <button
                                    onClick={() => openIssuePicker(entry.id, entry.issueIds)}
                                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded px-2 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                  >
                                    + 이슈 선택
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 주차 추가 모달 */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="주차 추가">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">미팅일</label>
            <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주차 라벨</label>
            <select value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              {Array.from({ length: 20 }, (_, i) => `${i + 1}W`).map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">추가</button>
          </div>
        </form>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="주차 삭제">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          <strong>{deleteTarget?.weekDate} ({deleteTarget?.weekLabel})</strong> 주간 보고를 삭제하시겠습니까?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">취소</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">삭제</button>
        </div>
      </Modal>

      {/* 이슈 선택 모달 */}
      <Modal open={issuePickerOpen} onClose={() => setIssuePickerOpen(false)} title="이슈 선택">
        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {allIssues.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">등록된 이슈가 없습니다.</p>
          ) : (
            allIssues.map((issue) => {
              const isSelected = pickerSelected.has(issue.issueCode);
              return (
                <label
                  key={issue.id}
                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleIssueSelection(issue.issueCode)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{issue.issueCode}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        issue.issueType === "위험" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>{issue.issueType}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        issue.status === "완료" ? "bg-green-100 text-green-700" :
                        issue.status === "진행중" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{issue.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{issue.description}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700 mt-3">
          <span className="text-xs text-gray-400">{pickerSelected.size}개 선택됨</span>
          <div className="flex gap-2">
            <button onClick={() => setIssuePickerOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">취소</button>
            <button onClick={confirmIssuePicker} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">확인</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
