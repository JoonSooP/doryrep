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
  mustChangePassword: boolean;
  _count?: { tasks: number };
};

const ROLES = ["Viewer", "Editor", "Admin"];

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
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setLoginId(""); setName(""); setEmail(""); setRole("Viewer"); setError("");
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setLoginId(user.loginId); setName(user.name); setEmail(user.email); setRole(user.role); setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !name.trim()) return;
    setError("");

    if (editingUser) {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || loginId.trim(), role }),
      });
      if (!res.ok) { setError((await res.json()).error || "수정 실패"); return; }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), name: name.trim(), email: email.trim() || loginId.trim(), role }),
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
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
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
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">이름</th>
                <th className="px-5 py-3 font-medium text-center">권한</th>
                <th className="px-5 py-3 font-medium text-center">PW 상태</th>
                <th className="px-5 py-3 font-medium text-center">배정 태스크</th>
                {isAdmin && <th className="px-5 py-3 font-medium text-right">관리</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-700">{user.loginId}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                        {user.name[0]}
                      </span>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === "Admin" ? "bg-red-100 text-red-700" :
                      user.role === "Editor" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {user.mustChangePassword ? (
                      <span className="text-xs text-amber-600">변경 필요</span>
                    ) : (
                      <span className="text-xs text-green-600">정상</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500">{user._count?.tasks ?? 0}개</td>
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
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={!!editingUser}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
              placeholder="로그인 ID"
              autoFocus
            />
            {!editingUser && <p className="text-xs text-gray-400 mt-1">초기 비밀번호는 ID와 동일하게 설정됩니다</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="이름"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    role === r
                      ? r === "Admin" ? "bg-red-50 border-red-300 text-red-700 font-medium"
                        : r === "Editor" ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                        : "bg-gray-50 border-gray-300 text-gray-700 font-medium"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingUser ? "수정" : "추가"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="사용자 삭제">
        <p className="text-sm text-gray-600 mb-1"><strong>{deleteTarget?.name}</strong>({deleteTarget?.loginId})을 삭제하시겠습니까?</p>
        {(deleteTarget?._count?.tasks ?? 0) > 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            배정된 태스크 {deleteTarget?._count?.tasks}개가 미지정으로 변경됩니다.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">삭제</button>
        </div>
      </Modal>
    </div>
  );
}
