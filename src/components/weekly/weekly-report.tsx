"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";

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

export function WeeklyReport({ projectId }: { projectId: string }) {
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

  const load = () => {
    fetch(`/api/weekly?projectId=${projectId}`).then((r) => r.json()).then(setReports);
  };

  const loadParents = () => {
    fetch(`/api/milestones?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: ParentMilestone[]) => {
        const roots = data.filter((m: any) => !m.parentId).sort((a, b) => a.order - b.order);
        setParents(roots);
        // 기본 모두 접기
        setExpandedCategories((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const collapsed: Record<string, boolean> = {};
          roots.forEach((r) => { collapsed[r.id] = false; });
          return collapsed;
        });
      });
  };

  useEffect(() => { load(); loadParents(); }, [projectId]);

  // 대분류별로 주차 그룹핑
  const categoryWeeklies = useMemo(() => {
    return parents.map((parent) => {
      const cs = getColor(parent.color);
      // 이 대분류에 해당하는 엔트리가 있는 리포트만 필터
      const weeklyRows = reports
        .map((report) => {
          const entry = report.entries.find((e) => e.milestone.id === parent.id);
          return entry ? { report, entry } : null;
        })
        .filter(Boolean) as { report: Report; entry: WeeklyEntry }[];

      // 정렬
      weeklyRows.sort((a, b) =>
        sortOrder === "desc"
          ? b.report.weekDate.localeCompare(a.report.weekDate)
          : a.report.weekDate.localeCompare(b.report.weekDate)
      );

      return { parent, cs, weeklyRows };
    });
  }, [parents, reports, sortOrder]);

  // 다음 목요일 계산
  const getNextThursday = () => {
    const now = new Date();
    const day = now.getDay(); // 0=일, 4=목
    const diff = day <= 4 ? 4 - day : 7 - day + 4;
    const thu = new Date(now);
    thu.setDate(thu.getDate() + diff);
    return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, "0")}-${String(thu.getDate()).padStart(2, "0")}`;
  };

  // 마지막 주차 라벨에서 +1
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{reports.length}개 주차</span>
        <div className="flex items-center gap-2">
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
          <p className="mb-1">대분류가 없습니다</p>
          <p className="text-sm">프로젝트 일정에서 대분류를 먼저 추가해 주세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryWeeklies.map(({ parent, cs, weeklyRows }) => {
            const isExpanded = expandedCategories[parent.id] ?? false;
            return (
              <div key={parent.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
                {/* 대분류 헤더 */}
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

                {/* 주차별 테이블 */}
                {isExpanded && (
                  weeklyRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border-t dark:border-gray-700">
                      등록된 주간 보고가 없습니다. 주차를 추가해 주세요.
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse border-t dark:border-gray-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          <th
                            className="px-3 py-2 font-semibold text-left w-28 border-r cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}
                          >
                            미팅일 {sortOrder === "desc" ? "▼" : "▲"}
                          </th>
                          <th
                            className="px-3 py-2 font-semibold text-left w-14 border-r cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                            onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}
                          >
                            주차{sortOrder === "desc" ? "▼" : "▲"}
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r">
                            <span className="text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded text-xs font-bold">지난주 실적</span>
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r">
                            <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded text-xs font-bold">이번주 계획</span>
                          </th>
                          <th className="px-3 py-2 font-semibold text-left border-r w-36">이슈/협의필요</th>
                          <th className="px-3 py-2 font-semibold text-left w-28">이슈관리 ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyRows.map(({ report, entry }) => (
                          <tr key={entry.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                            <td className="px-3 py-2 border-r dark:border-gray-700 align-top text-gray-700 dark:text-gray-300">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{report.weekDate}</span>
                                {canEdit && (
                                  <button
                                    onClick={() => setDeleteTarget(report)}
                                    className="text-gray-300 hover:text-red-500 text-base w-6 h-6 flex items-center justify-center rounded hover:bg-red-50"
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r dark:border-gray-700 align-top font-semibold text-gray-700 dark:text-gray-300 text-xs">
                              {report.weekLabel}
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.lastWeek}
                                onChange={(e) => handleEntryChange(entry.id, "lastWeek", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-xs text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[140px] ${canEdit ? "focus:bg-yellow-50" : "cursor-default"}`}
                                placeholder="· 실적 내용"
                              />
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.thisWeek}
                                onChange={(e) => handleEntryChange(entry.id, "thisWeek", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-xs text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[140px] ${canEdit ? "focus:bg-green-50" : "cursor-default"}`}
                                placeholder="· 계획 내용"
                              />
                            </td>
                            <td className="px-1 py-1 border-r dark:border-gray-700 align-top">
                              <textarea
                                value={entry.issues}
                                onChange={(e) => handleEntryChange(entry.id, "issues", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-xs text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[140px] ${canEdit ? "focus:bg-red-50" : "cursor-default"}`}
                                placeholder="· 이슈 내용"
                              />
                            </td>
                            <td className="px-1 py-1 align-top">
                              <textarea
                                value={entry.issueIds}
                                onChange={(e) => handleEntryChange(entry.id, "issueIds", e.target.value)}
                                readOnly={!canEdit}
                                className={`w-full text-xs text-gray-700 dark:text-gray-300 border-0 bg-transparent resize-none focus:outline-none rounded p-1.5 min-h-[140px] ${canEdit ? "focus:bg-blue-50" : "cursor-default"}`}
                                placeholder="PMO-0000-000"
                              />
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
            <input
              type="date"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주차 라벨</label>
            <select
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
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
    </div>
  );
}
