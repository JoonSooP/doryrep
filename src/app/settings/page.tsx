"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

function PwInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
      >
        {show ? "\uD83D\uDE48" : "\uD83D\uDC41"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess("비밀번호가 변경되었습니다");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">설정</h1>

      {/* 내 정보 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">내 정보</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center">
            <span className="w-20 text-gray-400">ID</span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{user.loginId}</span>
          </div>
          <div className="flex items-center">
            <span className="w-20 text-gray-400">이름</span>
            <span className="text-gray-700 dark:text-gray-200">{user.name}</span>
          </div>
          <div className="flex items-center">
            <span className="w-20 text-gray-400">권한</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.role === "Admin" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
              user.role === "Editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
              "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">비밀번호 변경</h2>
        <p className="text-xs text-gray-400 mb-4">대/소문자, 숫자, 특수문자 포함 8자 이상</p>

        <form onSubmit={handleChangePw} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/30 rounded-lg px-3 py-2">{success}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">현재 비밀번호</label>
            <PwInput value={currentPassword} onChange={setCurrentPassword} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">새 비밀번호</label>
            <PwInput value={newPassword} onChange={setNewPassword} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">새 비밀번호 확인</label>
            <PwInput value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
