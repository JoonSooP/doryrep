"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  id: string;
  user: { id: string; loginId: string; name: string; role: string; userType: string };
};
type UserOption = { id: string; loginId: string; name: string };

export function ProjectMembers({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/members`);
    const data = await r.json();
    setMembers(Array.isArray(data) ? data : []);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => Array.isArray(d) && setAllUsers(d));
  }, []);

  async function add() {
    if (!selected) return;
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected }),
    });
    if (res.ok) { setSelected(""); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.error || "추가 실패"); }
  }

  async function remove(userId: string) {
    if (!confirm("멤버를 제외하시겠습니까?")) return;
    await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
    load();
  }

  const memberIds = new Set(members.map((m) => m.user.id));
  const candidates = allUsers.filter((u) => !memberIds.has(u.id));

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 bg-white dark:bg-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40"
      >
        <span>프로젝트 멤버 <span className="ml-2 text-gray-400 font-normal">({members.length}명)</span></span>
        <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-wrap gap-2 mb-3">
            {members.length === 0 && <span className="text-xs text-gray-400">등록된 멤버가 없습니다.</span>}
            {members.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] flex items-center justify-center font-semibold">
                  {m.user.name[0]}
                </span>
                <span className="text-gray-700 dark:text-gray-200">{m.user.name}</span>
                <span className="text-[10px] text-gray-400">{m.user.userType}</span>
                <button onClick={() => remove(m.user.id)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">사용자 선택</option>
              {candidates.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.loginId})</option>)}
            </select>
            <button
              onClick={add}
              disabled={!selected}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              + 멤버 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
