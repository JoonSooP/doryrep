"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";
import type { Issue } from "@/types";

const ISSUE_TYPES = ["이슈", "위험"] as const;
const ISSUE_STATUSES = ["Open", "진행중", "완료", "보류"] as const;

function formatDate(d: string | null) {
  if (!d) return "";
  return d.slice(0, 10);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    Open: "bg-blue-100 text-blue-700",
    "진행중": "bg-yellow-100 text-yellow-700",
    "완료": "bg-green-100 text-green-700",
    "보류": "bg-gray-100 text-gray-500",
  };
  return colors[status] ?? "bg-gray-100 text-gray-600";
}

function typeBadge(type: string) {
  return type === "위험"
    ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";
}

function emptyForm() {
  return {
    category: "",
    registeredAt: new Date().toISOString().slice(0, 10),
    issueCode: "",
    description: "",
    issueType: "이슈" as string,
    assignee: "",
    responsible: "",
    result: "",
    status: "Open" as string,
    planStartDate: "",
    planEndDate: "",
    actualStartDate: "",
    actualEndDate: "",
  };
}

export function IssueList({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/issues?projectId=${projectId}`);
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  useEffect(() => {
    fetch(`/api/milestones/categories?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, [projectId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setCustomCategory(false);
    setModalOpen(true);
  }

  function openEdit(issue: Issue) {
    setEditing(issue);
    setForm({
      category: issue.category,
      registeredAt: issue.registeredAt,
      issueCode: issue.issueCode,
      description: issue.description,
      issueType: issue.issueType,
      assignee: issue.assignee,
      responsible: issue.responsible,
      result: issue.result,
      status: issue.status,
      planStartDate: issue.planStartDate ?? "",
      planEndDate: issue.planEndDate ?? "",
      actualStartDate: issue.actualStartDate ?? "",
      actualEndDate: issue.actualEndDate ?? "",
    });
    const isKnown = categories.includes(issue.category) || issue.category === "PMO";
    setCustomCategory(!isKnown);
    setModalOpen(true);
  }

  async function handleSave() {
    const body = {
      ...form,
      planStartDate: form.planStartDate || null,
      planEndDate: form.planEndDate || null,
      actualStartDate: form.actualStartDate || null,
      actualEndDate: form.actualEndDate || null,
      projectId,
    };
    if (editing) {
      await fetch(`/api/issues/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/issues/${id}`, { method: "DELETE" });
    load();
  }

  const grouped = issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    const cat = issue.category || "기타";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(issue);
    return acc;
  }, {});

  const totalCols = canEdit ? 14 : 13;

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">이슈_Action Item 관리대장</h2>
        {canEdit && (
          <button onClick={openCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 이슈 등록
          </button>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse min-w-[1400px]">
          <thead>
            <tr className="bg-amber-100 text-gray-700">
              <th className="border px-2 py-2 text-center" rowSpan={2}>대분류</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>등록일</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>이슈ID</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>내역</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>구분</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>조치<br/>담당자</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>현업<br/>담당자</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>처리 결과</th>
              <th className="border px-2 py-2 text-center" colSpan={2}>계획</th>
              <th className="border px-2 py-2 text-center" colSpan={2}>실적</th>
              <th className="border px-2 py-2 text-center" rowSpan={2}>상태</th>
              {canEdit && <th className="border px-2 py-2 text-center" rowSpan={2}>관리</th>}
            </tr>
            <tr className="bg-amber-50 text-gray-600">
              <th className="border px-2 py-1 text-center text-xs">시작일</th>
              <th className="border px-2 py-1 text-center text-xs">종료일</th>
              <th className="border px-2 py-1 text-center text-xs">시작일</th>
              <th className="border px-2 py-1 text-center text-xs">종료일</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([category, catIssues]) =>
              catIssues.map((issue, idx) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  {idx === 0 && (
                    <td className="border px-2 py-2 text-center text-xs font-medium bg-gray-50 align-middle" rowSpan={catIssues.length}>
                      {category}
                    </td>
                  )}
                  <td className="border px-2 py-2 text-center text-xs whitespace-nowrap">{formatDate(issue.registeredAt)}</td>
                  <td className="border px-2 py-2 text-center text-xs text-gray-600">{issue.issueCode}</td>
                  <td className="border px-2 py-2 text-xs whitespace-pre-wrap max-w-[300px]">{issue.description}</td>
                  <td className="border px-2 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadge(issue.issueType)}`}>
                      {issue.issueType}
                    </span>
                  </td>
                  <td className="border px-2 py-2 text-center text-xs">{issue.assignee}</td>
                  <td className="border px-2 py-2 text-center text-xs">{issue.responsible}</td>
                  <td className="border px-2 py-2 text-xs whitespace-pre-wrap max-w-[200px]">{issue.result}</td>
                  <td className="border px-2 py-2 text-center text-xs whitespace-nowrap">{formatDate(issue.planStartDate)}</td>
                  <td className="border px-2 py-2 text-center text-xs whitespace-nowrap">{formatDate(issue.planEndDate)}</td>
                  <td className="border px-2 py-2 text-center text-xs whitespace-nowrap">{formatDate(issue.actualStartDate)}</td>
                  <td className="border px-2 py-2 text-center text-xs whitespace-nowrap">{formatDate(issue.actualEndDate)}</td>
                  <td className="border px-2 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(issue.status)}`}>
                      {issue.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="border px-2 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEdit(issue)} className="text-blue-500 hover:text-blue-700 text-xs">수정</button>
                        <button onClick={() => handleDelete(issue.id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
            {issues.length === 0 && (
              <tr><td colSpan={totalCols} className="text-center py-8 text-gray-400">등록된 이슈가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "이슈 수정" : "이슈 등록"}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대분류</label>
              {customCategory ? (
                <div className="flex gap-1">
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="대분류 직접 입력" />
                  <button type="button" onClick={() => setCustomCategory(false)} className="px-2 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">목록</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select value={form.category} onChange={(e) => {
                    if (e.target.value === "__custom__") { setCustomCategory(true); setForm({ ...form, category: "" }); }
                    else setForm({ ...form, category: e.target.value });
                  }} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">선택</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    {!categories.includes("PMO") && <option value="PMO">PMO</option>}
                    <option value="__custom__">직접 입력...</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이슈ID</label>
              <input value={form.issueCode} onChange={(e) => setForm({ ...form, issueCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="예: B-0317-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">등록일</label>
              <input type="date" value={form.registeredAt} onChange={(e) => setForm({ ...form, registeredAt: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">내역</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">구분</label>
              <select value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">조치담당자</label>
              <input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">현업담당자</label>
              <input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">처리 결과</label>
              <textarea value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2">계획</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시작일</label>
                  <input type="date" value={form.planStartDate} onChange={(e) => setForm({ ...form, planStartDate: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">종료일</label>
                  <input type="date" value={form.planEndDate} onChange={(e) => setForm({ ...form, planEndDate: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2">실적</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시작일</label>
                  <input type="date" value={form.actualStartDate} onChange={(e) => setForm({ ...form, actualStartDate: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">종료일</label>
                  <input type="date" value={form.actualEndDate} onChange={(e) => setForm({ ...form, actualEndDate: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? "수정" : "등록"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
