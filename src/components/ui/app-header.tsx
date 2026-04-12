"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/change-password"];

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
      return;
    }
    if (user?.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
  }, [user, loading, pathname, router]);

  // 로딩 중이거나 로그인/비번변경 페이지에서는 헤더 숨김
  if (loading) return null;
  if (PUBLIC_PATHS.includes(pathname)) return null;
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          {process.env.NEXT_PUBLIC_VERCEL ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs">CLOUD</span>
              <span className="text-gray-900">ProjectHub</span>
            </>
          ) : (
            <>
              <span className="px-1.5 py-0.5 rounded bg-green-600 text-white text-xs">LOCAL</span>
              <span className="text-gray-900">ProjectHub</span>
            </>
          )}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            프로젝트
          </Link>
          <Link href="/users" className="text-sm text-gray-600 hover:text-gray-900">
            사용자
          </Link>
          <Link href="/applications" className="text-sm text-gray-600 hover:text-gray-900">
            앱
          </Link>
          <div className="flex items-center gap-2 ml-2 pl-4 border-l">
            <span className="text-xs text-gray-500">
              {user.name}
              <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[10px]">
                {user.role}
              </span>
            </span>
            <Link href="/settings" className="text-xs text-gray-400 hover:text-blue-500">
              설정
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              로그아웃
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
