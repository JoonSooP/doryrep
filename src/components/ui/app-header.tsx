"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/change-password"];

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
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
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          {process.env.NEXT_PUBLIC_VERCEL ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs">CLOUD</span>
              <span className="text-gray-900 dark:text-white">ProjectHub</span>
            </>
          ) : (
            <>
              <span className="px-1.5 py-0.5 rounded bg-green-600 text-white text-xs">LOCAL</span>
              <span className="text-gray-900 dark:text-white">ProjectHub</span>
            </>
          )}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            프로젝트
          </Link>
          <Link href="/users" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            사용자
          </Link>
          <Link href="/applications" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            앱
          </Link>
          <div className="flex items-center gap-2 ml-2 pl-4 border-l dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {user.name}
              <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 text-[10px]">
                {user.role}
              </span>
            </span>
            <button
              onClick={toggle}
              className="text-xs text-gray-400 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
            >
              {theme === "light" ? "\u263E" : "\u2600"}
            </button>
            <Link href="/settings" className="text-xs text-gray-400 dark:text-gray-300 hover:text-blue-500">
              설정
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 dark:text-gray-300 hover:text-red-500"
            >
              로그아웃
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
