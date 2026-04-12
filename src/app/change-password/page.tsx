"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

function PwInput({ value, onChange, autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        autoFocus={autoFocus}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

    refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">비밀번호 변경</h1>
          {user?.mustChangePassword && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4 text-center">
              최초 로그인입니다. 비밀번호를 변경해 주세요.
            </p>
          )}
          <p className="text-xs text-gray-400 text-center mb-6">
            대/소문자, 숫자, 특수문자 포함 8자 이상
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
              <PwInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
              <PwInput value={newPassword} onChange={setNewPassword} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
              <PwInput value={confirmPassword} onChange={setConfirmPassword} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
