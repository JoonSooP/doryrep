"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

type Application = {
  id: string;
  name: string;
  command: string;
  icon: string | null;
  _count?: { demos: number };
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/applications").then((r) => r.json()).then(setApps);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCommand("");
    setIcon("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (app: Application) => {
    setEditing(app);
    setName(app.name);
    setCommand(app.command);
    setIcon(app.icon ?? "");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;
    setError("");

    const body = { name: name.trim(), command: command.trim(), icon: icon.trim() || null };

    if (editing) {
      const res = await fetch(`/api/applications/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json()).error || "수정 실패");
        return;
      }
    } else {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json()).error || "생성 실패");
        return;
      }
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (app: Application) => {
    const count = app._count?.demos ?? 0;
    const msg = count > 0
      ? `${app.name}을(를) 사용 중인 시연 주제 ${count}개가 링크 방식으로 변경됩니다. 삭제하시겠습니까?`
      : `${app.name}을(를) 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">앱 관리</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + 새 앱
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">등록된 앱이 없습니다</p>
          <p className="text-sm">새 앱을 추가하세요</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">앱 이름</th>
                <th className="px-5 py-3 font-medium">실행 명령어</th>
                <th className="px-5 py-3 font-medium text-center">사용 중</th>
                <th className="px-5 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{app.name}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{app.command}</td>
                  <td className="px-5 py-3 text-center text-gray-500">{app._count?.demos ?? 0}개</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(app)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">
                      수정
                    </button>
                    <button onClick={() => handleDelete(app)} className="text-red-400 hover:text-red-600 text-xs">
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "앱 수정" : "새 앱"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">앱 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="예: Telegram"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">실행 명령어</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="예: open -a Telegram"
            />
            <p className="text-xs text-gray-400 mt-1">macOS: open -a AppName / Windows: start AppName</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              취소
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editing ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
