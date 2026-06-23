"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/contexts/auth-context";

type User = {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: string;
  userType: string;
  categories: string;
  mustChangePassword: boolean;
  _count?: { tasks: number };
};

const ROLES = ["Viewer", "Editor", "Admin"];
const USER_TYPES = ["현업", "프로젝트팀"];

export default function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "Admin";
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [userType, setUserType] = useState("프로젝트팀");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [groupedCategories, setGroupedCategories] = useState<{ projectId: string; projectName: string; categories: string[] }[]>([]);
  const [openCatRow, setOpenCatRow] = useState<string | null>(null);
  const [error, setError] = useState("");

  const patchUser = async (id: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const categoryProject = (cat: string) => {
    for (const g of groupedCategories) {
      if (g.categories.includes(cat)) return g.projectName;
    }
    return null;
  };

  const toggleRowCategory = (user: User, cat: string) => {
    const current = user.categories ? user.categories.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    patchUser(user.id, { categories: next.join(",") });
  };

  const load = () => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAllCategories(d); })
      .catch(() => {});
    fetch("/api/categories?grouped=1")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setGroupedCategories(d); })
      .catch(() => {});
  }, []);

  const toggleCategory = (c: string) => {
    setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const openCreate = () => {
    setEditingUser(null);
    setLoginId(""); setName(""); setEmail(""); setRole("Viewer");
    setUserType("프로젝트팀"); setSelectedCategories([]); setError("");
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setLoginId(user.loginId); setName(user.name); setEmail(user.email); setRole(user.role);
    setUserType(user.userType || "프로젝트팀");
    setSelectedCategories(user.categories ? user.categories.split(",").map((s) => s.trim()).filter(Boolean) : []);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !name.trim()) return;
    setError("");

    const categoriesStr = selectedCategories.join(",");
    if (editingUser) {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || loginId.trim(), role, userType, categories: categoriesStr }),
      });
      if (!res.ok) { setError((await res.json()).error || "수정 실패"); return; }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), name: name.trim(), email: email.trim() || loginId.trim(), role, userType, categories: categoriesStr }),
      });
      if (!res.ok) { setError((await res.json()).error || "생성 실패"); return; }
    }
    setModalOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  const resetPassword = async (user: User) => {
    if (!confirm(`${user.name}(${user.loginId})의 비밀번호를 초기화하시겠습니까?\n초기 비밀번호는 로그인 ID와 동일하게 설정됩니다.`)) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    if (res.ok) {
      alert(`비밀번호가 초기화되었습니다.\n초기 비밀번호: ${user.loginId}`);
      load();
    } else {
      alert("초기화에 실패했습니다.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>
        {isAdmin && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 새 사용자
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">등록된 사용자가 없습니다</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">이름</th>
                <th className="px-5 py-3 font-medium text-center">권한</th>
                <th className="px-5 py-3 font-medium text-center">역할</th>
                <th className="px-5 py-3 font-medium">담당과제</th>
                <th className="px-5 py-3 font-medium text-center">PW 상태</th>
                <th className="px-5 py-3 font-medium text-center">배정 태스크</th>
                {isAdmin && <th className="px-5 py-3 font-medium text-right">관리</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-300">{user.loginId}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
                        {user.name[0]}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {isAdmin ? (
                      <select
                        value={user.role}
                        onChange={(e) => patchUser(user.id, { role: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${
                          user.role === "Admin" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                          user.role === "Editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === "Admin" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                        user.role === "Editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                        "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}>{user.role}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {isAdmin ? (
                      <select
                        value={user.userType || "프로젝트팀"}
                        onChange={(e) => patchUser(user.id, { userType: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${
                          (user.userType || "프로젝트팀") === "현업"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        }`}
                      >
                        {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.userType === "현업"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      }`}>{user.userType || "프로젝트팀"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 relative">
                    <div className="flex flex-wrap items-center gap-1">
                      {(user.categories ? user.categories.split(",").map((s) => s.trim()).filter(Boolean) : []).map((c) => {
                        const proj = categoryProject(c);
                        return (
                          <span key={c} className="inline-flex items-center text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 overflow-hidden">
                            {proj && (
                              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-[10px] text-blue-800 dark:text-blue-300">{proj}</span>
                            )}
                            <span className="px-1.5 py-0.5">{c}</span>
                          </span>
                        );
                      })}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setOpenCatRow(openCatRow === user.id ? null : user.id)}
                          className="text-xs px-2 py-0.5 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          편집
                        </button>
                      )}
                    </div>
                    {isAdmin && openCatRow === user.id && (
                      <div className={`absolute z-20 left-5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[300px] max-h-72 overflow-y-auto ${
                        idx >= users.length - 2 ? "bottom-full mb-1" : "top-full mt-1"
                      }`}>
                        {groupedCategories.length === 0 || groupedCategories.every((g) => g.categories.length === 0) ? (
                          <p className="text-xs text-gray-400">등록된 과제가 없습니다</p>
                        ) : (
                          <div className="space-y-3">
                            {groupedCategories.filter((g) => g.categories.length > 0).map((g) => (
                              <div key={g.projectId}>
                                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{g.projectName}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {g.categories.map((c) => {
                                    const cats = user.categories ? user.categories.split(",").map((s) => s.trim()).filter(Boolean) : [];
                                    const active = cats.includes(c);
                                    return (
                                      <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleRowCategory(user, c)}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                                          active
                                            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                      >
                                        {c}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-end mt-2">
                          <button onClick={() => setOpenCatRow(null)} className="text-xs text-gray-500 hover:text-gray-700">닫기</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {user.mustChangePassword ? (
                      <span className="text-xs text-amber-600">변경 필요</span>
                    ) : (
                      <span className="text-xs text-green-600">정상</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400">{user._count?.tasks ?? 0}개</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(user)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">수정</button>
                      <button onClick={() => resetPassword(user)} className="text-amber-500 hover:text-amber-700 text-xs mr-2">PW초기화</button>
                      <button onClick={() => setDeleteTarget(user)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? "사용자 수정" : "새 사용자"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID</label>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={!!editingUser}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-600"
              placeholder="로그인 ID"
              autoFocus
            />
            {!editingUser && <p className="text-xs text-gray-400 mt-1">초기 비밀번호는 ID와 동일하게 설정됩니다</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="이름"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">권한</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    role === r
                      ? r === "Admin" ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 font-medium"
                        : r === "Editor" ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 font-medium"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">역할</label>
            <div className="flex gap-2">
              {USER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUserType(t)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    userType === t
                      ? t === "현업"
                        ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 font-medium"
                        : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-medium"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">담당과제</label>
            {groupedCategories.length === 0 || groupedCategories.every((g) => g.categories.length === 0) ? (
              <p className="text-xs text-gray-400">등록된 과제가 없습니다 (프로젝트 일정의 대분류가 과제 목록입니다)</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto border dark:border-gray-700 rounded-lg p-3">
                {groupedCategories.filter((g) => g.categories.length > 0).map((g) => (
                  <div key={g.projectId}>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{g.projectName}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCategory(c)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            selectedCategories.includes(c)
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 font-medium"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingUser ? "수정" : "추가"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="사용자 삭제">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>{deleteTarget?.name}</strong>({deleteTarget?.loginId})을 삭제하시겠습니까?</p>
        {(deleteTarget?._count?.tasks ?? 0) > 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2 mb-4">
            배정된 태스크 {deleteTarget?._count?.tasks}개가 미지정으로 변경됩니다.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">취소</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">삭제</button>
        </div>
      </Modal>
    </div>
  );
}
