"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";
import type { Issue } from "@/types";
import * as XLSX from "xlsx";

const ISSUE_TYPES = ["이슈", "위험"] as const;
const ISSUE_STATUSES = ["Open", "진행중", "완료", "보류"] as const;

// 과제명 → 영어 약어 3글자 매핑
const CATEGORY_ABBR: Record<string, string> = {
  "SKMS Agent": "SKM",
  "FTE 감축 Agent": "FTE",
  "PMO": "PMO",
};

function getCategoryAbbr(category: string): string {
  if (CATEGORY_ABBR[category]) return CATEGORY_ABBR[category];
  // 영어면 앞 3글자, 한글이면 첫 글자들 조합
  const eng = category.replace(/[^a-zA-Z]/g, "");
  if (eng.length >= 3) return eng.slice(0, 3).toUpperCase();
  return category.slice(0, 3).toUpperCase();
}

function generateIssueCode(category: string, registeredAt: string, existingIssues: Issue[]): string {
  const abbr = getCategoryAbbr(category);
  const dateStr = registeredAt.replace(/-/g, "").slice(2); // YYMMDD
  // 같은 과제 + 같은 날짜의 기존 이슈 수 카운트
  const samePrefix = `${abbr}-${dateStr}`;
  const count = existingIssues.filter((i) => i.issueCode.startsWith(samePrefix)).length;
  return `${abbr}-${dateStr}-${String(count + 1).padStart(3, "0")}`;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return d.slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekLaterStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function statusColor(status: string) {
  const m: Record<string, string> = {
    Open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    "진행중": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "완료": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    "보류": "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };
  return m[status] ?? "";
}

function typeColor(type: string) {
  return type === "위험"
    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
}

const inputCls = "w-full border dark:border-gray-600 rounded px-2 py-1 text-sm bg-transparent dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none";
const selectCls = "border dark:border-gray-600 rounded px-1 py-0.5 text-sm bg-transparent dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none";

export function IssueList({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState(false);

  // 등록 폼
  const [formCategory, setFormCategory] = useState("");
  const [formRegisteredAt, setFormRegisteredAt] = useState(todayStr());
  const [formDescription, setFormDescription] = useState("");
  const [formIssueType, setFormIssueType] = useState<string>("이슈");
  const [formAssignee, setFormAssignee] = useState("");
  const [formResponsible, setFormResponsible] = useState("");

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues?projectId=${projectId}`);
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`/api/milestones/categories?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, [projectId]);

  // 인라인 수정 (디바운스)
  function handleFieldChange(issueId: string, field: string, value: string) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, [field]: value } : i))
    );

    if (debounceTimers.current[issueId + field]) clearTimeout(debounceTimers.current[issueId + field]);
    debounceTimers.current[issueId + field] = setTimeout(async () => {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
    }, 500);
  }

  // 즉시 저장 (select 변경)
  async function handleSelectChange(issueId: string, field: string, value: string) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, [field]: value } : i))
    );
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/issues/${id}`, { method: "DELETE" });
    load();
  }

  function openCreate() {
    setFormCategory("");
    setFormRegisteredAt(todayStr());
    setFormDescription("");
    setFormIssueType("이슈");
    setFormAssignee("");
    setFormResponsible("");
    setCustomCategory(false);
    setModalOpen(true);
  }

  async function handleCreate() {
    if (!formCategory || !formDescription.trim()) return;

    const issueCode = generateIssueCode(formCategory, formRegisteredAt, issues);

    await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        category: formCategory,
        registeredAt: formRegisteredAt,
        issueCode,
        description: formDescription.trim(),
        issueType: formIssueType,
        assignee: formAssignee.trim(),
        responsible: formResponsible.trim(),
        result: "",
        status: "Open",
        planStartDate: todayStr(),
        planEndDate: weekLaterStr(),
        actualStartDate: null,
        actualEndDate: null,
      }),
    });
    setModalOpen(false);
    load();
  }

  const exportToExcel = useCallback(() => {
    if (issues.length === 0) { alert("내려받을 데이터가 없습니다."); return; }
    const rows = issues.map((i) => ({
      "과제": i.category,
      "등록일": formatDate(i.registeredAt),
      "이슈ID": i.issueCode,
      "내역": i.description,
      "구분": i.issueType,
      "상태": i.status,
      "조치담당자": i.assignee,
      "현업담당자": i.responsible,
      "처리 결과": i.result,
      "계획 시작일": formatDate(i.planStartDate),
      "계획 종료일": formatDate(i.planEndDate),
      "실적 시작일": formatDate(i.actualStartDate),
      "실적 종료일": formatDate(i.actualEndDate),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "이슈관리");
    ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 50 }, { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.writeFile(wb, `이슈관리대장_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [issues]);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">이슈_Action Item 관리대장</h2>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <button
              onClick={exportToExcel}
              className="px-3 py-1.5 border dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Excel 내려받기
            </button>
          )}
          {canEdit && (
            <button onClick={openCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              + 이슈 등록
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm border-collapse min-w-[1800px] dark:text-gray-300">
          <thead>
            <tr className="bg-amber-100 dark:bg-amber-900/40 text-gray-700 dark:text-gray-200">
              <th className="border px-2 py-2 text-center w-28" rowSpan={2}>과제</th>
              <th className="border px-2 py-2 text-center w-28" rowSpan={2}>등록일</th>
              <th className="border px-2 py-2 text-center w-36" rowSpan={2}>이슈ID</th>
              <th className="border px-2 py-2 text-center min-w-[350px]" rowSpan={2}>내역</th>
              <th className="border px-2 py-2 text-center w-20" rowSpan={2}>구분</th>
              <th className="border px-2 py-2 text-center w-24" rowSpan={2}>상태</th>
              <th className="border px-2 py-2 text-center w-24" rowSpan={2}>조치<br/>담당자</th>
              <th className="border px-2 py-2 text-center w-24" rowSpan={2}>현업<br/>담당자</th>
              <th className="border px-2 py-2 text-center min-w-[280px]" rowSpan={2}>처리 결과</th>
              <th className="border px-2 py-2 text-center" colSpan={2}>계획</th>
              <th className="border px-2 py-2 text-center" colSpan={2}>실적</th>
              {canEdit && <th className="border px-2 py-2 text-center w-14" rowSpan={2}>삭제</th>}
            </tr>
            <tr className="bg-amber-50 dark:bg-amber-900/20 text-gray-600 dark:text-gray-400">
              <th className="border px-2 py-1 text-center text-xs">시작일</th>
              <th className="border px-2 py-1 text-center text-xs">종료일</th>
              <th className="border px-2 py-1 text-center text-xs">시작일</th>
              <th className="border px-2 py-1 text-center text-xs">종료일</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="border dark:border-gray-700 px-2 py-2 text-center text-sm font-medium bg-gray-50 dark:bg-gray-800">
                  {issue.category}
                </td>
                <td className="border px-2 py-2 text-center text-sm whitespace-nowrap">
                  {formatDate(issue.registeredAt)}
                </td>
                <td className="border px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {issue.issueCode}
                </td>
                <td className="border px-1 py-1">
                  {canEdit ? (
                    <textarea
                      value={issue.description}
                      onChange={(e) => handleFieldChange(issue.id, "description", e.target.value)}
                      className={`${inputCls} resize-none min-h-[36px]`}
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm whitespace-pre-wrap px-1">{issue.description}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <select
                      value={issue.issueType}
                      onChange={(e) => handleSelectChange(issue.id, "issueType", e.target.value)}
                      className={`${selectCls} ${typeColor(issue.issueType)} font-medium`}
                    >
                      {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${typeColor(issue.issueType)}`}>
                      {issue.issueType}
                    </span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <select
                      value={issue.status}
                      onChange={(e) => handleSelectChange(issue.id, "status", e.target.value)}
                      className={`${selectCls} ${statusColor(issue.status)} font-medium`}
                    >
                      {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${statusColor(issue.status)}`}>
                      {issue.status}
                    </span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input value={issue.assignee} onChange={(e) => handleFieldChange(issue.id, "assignee", e.target.value)} className={`${inputCls} text-center`} />
                  ) : (
                    <span className="text-sm">{issue.assignee}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input value={issue.responsible} onChange={(e) => handleFieldChange(issue.id, "responsible", e.target.value)} className={`${inputCls} text-center`} />
                  ) : (
                    <span className="text-sm">{issue.responsible}</span>
                  )}
                </td>
                <td className="border px-1 py-1">
                  {canEdit ? (
                    <textarea
                      value={issue.result}
                      onChange={(e) => handleFieldChange(issue.id, "result", e.target.value)}
                      className={`${inputCls} resize-none min-h-[36px]`}
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm whitespace-pre-wrap px-1">{issue.result}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input type="date" value={formatDate(issue.planStartDate)} onChange={(e) => handleFieldChange(issue.id, "planStartDate", e.target.value)} className={`${inputCls} text-center text-xs`} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatDate(issue.planStartDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input type="date" value={formatDate(issue.planEndDate)} onChange={(e) => handleFieldChange(issue.id, "planEndDate", e.target.value)} className={`${inputCls} text-center text-xs`} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatDate(issue.planEndDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input type="date" value={formatDate(issue.actualStartDate)} onChange={(e) => handleFieldChange(issue.id, "actualStartDate", e.target.value)} className={`${inputCls} text-center text-xs`} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatDate(issue.actualStartDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <input type="date" value={formatDate(issue.actualEndDate)} onChange={(e) => handleFieldChange(issue.id, "actualEndDate", e.target.value)} className={`${inputCls} text-center text-xs`} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatDate(issue.actualEndDate)}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="border px-1 py-1 text-center">
                    <button onClick={() => handleDelete(issue.id)} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                  </td>
                )}
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={canEdit ? 14 : 13} className="text-center py-8 text-gray-400">등록된 이슈가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 이슈 등록 모달 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="이슈 등록">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">과제</label>
              {customCategory ? (
                <div className="flex gap-1">
                  <input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" placeholder="과제명 직접 입력" />
                  <button type="button" onClick={() => setCustomCategory(false)} className="px-2 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">목록</button>
                </div>
              ) : (
                <select value={formCategory} onChange={(e) => {
                  if (e.target.value === "__custom__") { setCustomCategory(true); setFormCategory(""); }
                  else setFormCategory(e.target.value);
                }} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                  <option value="">선택</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  {!categories.includes("PMO") && <option value="PMO">PMO</option>}
                  <option value="__custom__">직접 입력...</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">등록일</label>
              <input type="date" value={formRegisteredAt} onChange={(e) => setFormRegisteredAt(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">이슈ID (자동 생성)</label>
            <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
              {formCategory ? generateIssueCode(formCategory, formRegisteredAt, issues) : "과제를 선택하면 자동 생성됩니다"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">내역</label>
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">구분</label>
              <select value={formIssueType} onChange={(e) => setFormIssueType(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">조치담당자</label>
              <input value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">현업담당자</label>
              <input value={formResponsible} onChange={(e) => setFormResponsible(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">취소</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">등록</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
