"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { useAuth, useCanEdit } from "@/contexts/auth-context";
import type { ActionItem } from "@/types";
import * as XLSX from "xlsx";

type SortKey = "category" | "actionCategory" | "description" | "priority" | "requester" | "assignee" | "requestDate" | "startDate" | "endDate" | "progress" | "workContent" | "status";
const PRIORITY_ORDER: Record<string, number> = { "상": 0, "중": 1, "하": 2 };

const STATUSES = ["Open", "In-Progress", "Review", "Pending", "Closed"] as const;
const ACTION_CATEGORIES = ["기능개선", "버그수정", "문서화", "협의/검토", "기타"] as const;
const PRIORITIES = ["상", "중", "하"] as const;

function priorityColor(p: string) {
  const m: Record<string, string> = {
    "상": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    "중": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "하": "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  };
  return m[p] ?? "";
}

type UserOption = { id: string; name: string };

function formatDate(d: string | null) {
  return d ? d.slice(0, 10) : "";
}
function formatMD(d: string | null) {
  if (!d) return "";
  const s = d.slice(0, 10);
  return s.length >= 10 ? s.slice(5) : s;
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
    "Open": "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    "In-Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    "Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "Pending": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    "Closed": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  };
  return m[status] ?? "";
}

const inputCls = "w-full border dark:border-gray-600 rounded px-2 py-1 text-sm bg-transparent dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none";
const selectCls = "border dark:border-gray-600 rounded px-1 py-0.5 text-sm bg-transparent dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none";

function DateMD({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };
  return (
    <div
      onClick={open}
      className="relative w-full cursor-pointer text-center text-sm border dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      {value ? formatMD(value) : <span className="text-gray-400">-</span>}
      <input
        ref={ref}
        type="date"
        value={formatDate(value)}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        className="sr-only absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
    </div>
  );
}

export function ActionItemList({ projectId }: { projectId: string }) {
  const canEditBase = useCanEdit();
  const { user } = useAuth();
  const isHyeonup = user?.userType === "현업";
  const canEdit = canEditBase || isHyeonup;
  const canEditRestricted = canEditBase && !isHyeonup;
  const myCategories = (user?.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [progressDraft, setProgressDraft] = useState<Record<string, string>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  function startRowResize(id: string, e: React.MouseEvent<HTMLTableRowElement>) {
    const tr = e.currentTarget;
    const rect = tr.getBoundingClientRect();
    if (e.clientY < rect.bottom - 6) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = rect.height;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    const onMove = (m: MouseEvent) => {
      setRowHeights((prev) => ({ ...prev, [id]: Math.max(40, startH + (m.clientY - startY)) }));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  function rowCursor(e: React.MouseEvent<HTMLTableRowElement>) {
    const tr = e.currentTarget;
    const rect = tr.getBoundingClientRect();
    tr.style.cursor = e.clientY >= rect.bottom - 6 ? "row-resize" : "";
  }
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const filterInit = useRef(false);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  }
  function sortIndicator(k: SortKey) {
    if (sortKey !== k) return "";
    return sortAsc ? " ▲" : " ▼";
  }
  const [modalOpen, setModalOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);

  const [formCategory, setFormCategory] = useState("");
  const [formActionCategory, setFormActionCategory] = useState<string>(ACTION_CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<string>("중");
  const [formRequester, setFormRequester] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formRequestDate, setFormRequestDate] = useState(todayStr());
  const [formStartDate, setFormStartDate] = useState(todayStr());
  const [formEndDate, setFormEndDate] = useState(weekLaterStr());

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/action-items?projectId=${projectId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (filterInit.current) return;
    if (myCategories.length === 1) {
      setFilterCategory(myCategories[0]);
      filterInit.current = true;
    }
  }, [myCategories]);

  useEffect(() => {
    fetch(`/api/milestones/categories?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      })
      .catch(() => {});
  }, []);

  function handleFieldChange(id: string, field: string, value: string | number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    const key = id + field;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(async () => {
      await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value === "" ? null : value }),
      });
    }, 500);
  }

  async function handleSelectChange(id: string, field: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/action-items/${id}`, { method: "DELETE" });
    load();
  }

  function openCreate() {
    setFormCategory(filterCategory || "");
    setFormActionCategory(ACTION_CATEGORIES[0]);
    setFormDescription("");
    setFormPriority("중");
    setFormRequester(user?.name ?? "");
    setFormAssignee("");
    setFormRequestDate(todayStr());
    setFormStartDate(todayStr());
    setFormEndDate(weekLaterStr());
    setCustomCategory(false);
    setModalOpen(true);
  }

  async function handleCreate() {
    if (!formCategory || !formDescription.trim()) return;
    await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        category: formCategory,
        actionCategory: formActionCategory,
        description: formDescription.trim(),
        priority: formPriority,
        requester: formRequester.trim(),
        assignee: formAssignee.trim(),
        requestDate: formRequestDate,
        startDate: formStartDate,
        endDate: formEndDate,
        progress: 0,
        status: "Open",
      }),
    });
    setModalOpen(false);
    load();
  }

  const filteredBase = filterCategory ? items.filter((i) => i.category === filterCategory) : items;
  const filtered = sortKey ? [...filteredBase].sort((a, b) => {
    let av: string | number; let bv: string | number;
    if (sortKey === "priority") { av = PRIORITY_ORDER[a.priority] ?? 9; bv = PRIORITY_ORDER[b.priority] ?? 9; }
    else if (sortKey === "progress") { av = a.progress; bv = b.progress; }
    else { av = (a[sortKey] ?? "") as string; bv = (b[sortKey] ?? "") as string; }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  }) : filteredBase;

  function exportExcel() {
    if (filtered.length === 0) { alert("내려받을 데이터가 없습니다."); return; }
    const rows = filtered.map((i) => ({
      "과제": i.category,
      "Category": i.actionCategory,
      "Action 설명": i.description,
      "우선순위": i.priority,
      "요청자": i.requester,
      "담당자": i.assignee,
      "요청일": formatDate(i.requestDate),
      "시작일": formatDate(i.startDate),
      "종료(예상)": formatDate(i.endDate),
      "진척률(%)": i.progress,
      "작업 내용": i.workContent,
      "상태": i.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 50 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ActionItem");
    XLSX.writeFile(wb, `ActionItem_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  const allCategories = Array.from(new Set([...categories, ...items.map((i) => i.category)].filter(Boolean)));

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
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button onClick={exportExcel} className="px-3 py-1.5 border dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              Excel 내려받기
            </button>
          )}
          {canEdit && (
            <button onClick={openCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              + Action Item 등록
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm border-collapse min-w-[1500px] dark:text-gray-300">
          <thead>
            <tr className="bg-amber-100 dark:bg-amber-900/40 text-gray-700 dark:text-gray-200">
              <th onClick={() => toggleSort("category")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">과제{sortIndicator("category")}</th>
              <th onClick={() => toggleSort("actionCategory")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">Category{sortIndicator("actionCategory")}</th>
              <th onClick={() => toggleSort("description")} className="border px-2 py-2 text-center min-w-[320px] cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">Action 설명{sortIndicator("description")}</th>
              <th onClick={() => toggleSort("priority")} className="border px-2 py-2 text-center w-20 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">우선순위{sortIndicator("priority")}</th>
              <th onClick={() => toggleSort("requester")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">요청자{sortIndicator("requester")}</th>
              <th onClick={() => toggleSort("assignee")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">담당자{sortIndicator("assignee")}</th>
              <th onClick={() => toggleSort("requestDate")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">요청일{sortIndicator("requestDate")}</th>
              <th onClick={() => toggleSort("startDate")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">시작일{sortIndicator("startDate")}</th>
              <th onClick={() => toggleSort("endDate")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">종료(예상){sortIndicator("endDate")}</th>
              <th onClick={() => toggleSort("progress")} className="border px-2 py-2 text-center w-24 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">진척률{sortIndicator("progress")}</th>
              <th onClick={() => toggleSort("workContent")} className="border px-2 py-2 text-center min-w-[300px] cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">작업 내용{sortIndicator("workContent")}</th>
              <th onClick={() => toggleSort("status")} className="border px-2 py-2 text-center w-28 cursor-pointer select-none hover:bg-amber-200 dark:hover:bg-amber-900/60">상태{sortIndicator("status")}</th>
              {canEdit && <th className="border px-2 py-2 text-center w-14">삭제</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                style={rowHeights[item.id] ? { height: rowHeights[item.id] } : undefined}
                onMouseDown={(e) => startRowResize(item.id, e)}
                onMouseMove={rowCursor}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 focus-within:bg-blue-50/40 dark:focus-within:bg-blue-900/20 [&:focus-within_textarea]:min-h-[140px]">
                <td className="border dark:border-gray-700 px-1 py-1 text-center text-sm font-medium bg-gray-50 dark:bg-gray-800">
                  {canEdit ? (
                    <select
                      value={item.category}
                      onChange={(e) => handleSelectChange(item.id, "category", e.target.value)}
                      className={`${selectCls} w-full font-medium`}
                    >
                      {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                      {item.category && !allCategories.includes(item.category) && (
                        <option value={item.category}>{item.category}</option>
                      )}
                    </select>
                  ) : (
                    <span>{item.category}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <select
                      value={item.actionCategory || ACTION_CATEGORIES[0]}
                      onChange={(e) => handleSelectChange(item.id, "actionCategory", e.target.value)}
                      className={selectCls}
                    >
                      {ACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm">{item.actionCategory}</span>
                  )}
                </td>
                <td className="border px-1 py-1">
                  {canEdit ? (
                    <textarea
                      value={item.description}
                      onChange={(e) => handleFieldChange(item.id, "description", e.target.value)}
                      className={`${inputCls} resize-none min-h-[36px]`}
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm whitespace-pre-wrap px-1">{item.description}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <select
                      value={item.priority || "중"}
                      onChange={(e) => handleSelectChange(item.id, "priority", e.target.value)}
                      className={`${selectCls} ${priorityColor(item.priority || "중")} font-medium`}
                    >
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${priorityColor(item.priority || "중")}`}>
                      {item.priority || "중"}
                    </span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEdit ? (
                    <select value={item.requester} onChange={(e) => handleSelectChange(item.id, "requester", e.target.value)} className={`${selectCls} w-full`}>
                      <option value="">-</option>
                      {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                      {item.requester && !users.some((u) => u.name === item.requester) && (
                        <option value={item.requester}>{item.requester}</option>
                      )}
                    </select>
                  ) : (
                    <span className="text-sm">{item.requester}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEditRestricted ? (
                    <select value={item.assignee} onChange={(e) => handleSelectChange(item.id, "assignee", e.target.value)} className={`${selectCls} w-full`}>
                      <option value="">-</option>
                      {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                      {item.assignee && !users.some((u) => u.name === item.assignee) && (
                        <option value={item.assignee}>{item.assignee}</option>
                      )}
                    </select>
                  ) : (
                    <span className="text-sm">{item.assignee}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEditRestricted ? (
                    <DateMD value={item.requestDate} onChange={(v) => handleFieldChange(item.id, "requestDate", v)} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatMD(item.requestDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEditRestricted ? (
                    <DateMD value={item.startDate} onChange={(v) => handleFieldChange(item.id, "startDate", v)} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatMD(item.startDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEditRestricted ? (
                    <DateMD value={item.endDate} onChange={(v) => handleFieldChange(item.id, "endDate", v)} />
                  ) : (
                    <span className="text-sm whitespace-nowrap">{formatMD(item.endDate)}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {canEditRestricted ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={progressDraft[item.id] ?? String(item.progress)}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, "");
                          setProgressDraft((d) => ({ ...d, [item.id]: v }));
                        }}
                        onBlur={() => {
                          const raw = progressDraft[item.id];
                          if (raw === undefined) return;
                          const n = Math.max(0, Math.min(100, Number(raw) || 0));
                          setProgressDraft((d) => { const { [item.id]: _, ...rest } = d; return rest; });
                          handleFieldChange(item.id, "progress", n);
                        }}
                        className={`${inputCls} text-center`}
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  ) : (
                    <span className="text-sm">{item.progress}%</span>
                  )}
                </td>
                <td className="border px-1 py-1">
                  {canEditRestricted ? (
                    <textarea
                      value={item.workContent}
                      onChange={(e) => handleFieldChange(item.id, "workContent", e.target.value)}
                      className={`${inputCls} resize-none min-h-[36px]`}
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm whitespace-pre-wrap px-1">{item.workContent}</span>
                  )}
                </td>
                <td className="border px-1 py-1 text-center">
                  {(canEditRestricted || (isHyeonup && item.status === "Review")) ? (
                    <select
                      value={item.status}
                      onChange={(e) => handleSelectChange(item.id, "status", e.target.value)}
                      className={`${selectCls} ${statusColor(item.status)} font-medium`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="border px-1 py-1 text-center">
                    {canEditRestricted ? (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-600 inline-flex items-center justify-center"
                        title="삭제"
                        aria-label="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={canEdit ? 13 : 12} className="text-center py-8 text-gray-400">등록된 Action Item이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Action Item 등록">
        <div className="space-y-3">
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
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                {!allCategories.includes("PMO") && <option value="PMO">PMO</option>}
                <option value="__custom__">직접 입력...</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
            <select value={formActionCategory} onChange={(e) => setFormActionCategory(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
              {ACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Action 설명</label>
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" rows={3} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">우선순위</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormPriority(p)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    formPriority === p
                      ? `${priorityColor(p)} font-medium border-current`
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className={isHyeonup ? "" : "grid grid-cols-2 gap-3"}>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">요청자</label>
              <select value={formRequester} onChange={(e) => setFormRequester(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                <option value="">선택</option>
                {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            {!isHyeonup && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">담당자</label>
                <select value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                  <option value="">선택</option>
                  {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {!isHyeonup && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">요청일</label>
                <input type="date" value={formRequestDate} onChange={(e) => setFormRequestDate(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">작업 시작일</label>
                <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">작업 종료(예상)</label>
                <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">취소</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">등록</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
