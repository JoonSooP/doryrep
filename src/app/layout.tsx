import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AppHeader } from "@/components/ui/app-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "프로젝트 관리",
  description: "프로젝트 및 태스크 관리 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-[family-name:var(--font-geist-sans)]">
        <AuthProvider>
          <AppHeader />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
