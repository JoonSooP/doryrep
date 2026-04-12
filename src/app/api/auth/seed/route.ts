import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST() {
  const existing = await prisma.user.findUnique({ where: { loginId: "admin" } });
  if (!existing) {
    const hash = await bcrypt.hash("admin1234!", 10);
    await prisma.user.create({
      data: {
        loginId: "admin",
        name: "관리자",
        email: "admin@admin.com",
        password: hash,
        role: "Admin",
        mustChangePassword: false,
      },
    });
  }

  // 기존 담당자 복원
  const users = [
    { loginId: "ss", name: "선빈", email: "ss" },
    { loginId: "jj", name: "원영", email: "jj" },
    { loginId: "dory", name: "준수", email: "dory" },
    { loginId: "ong", name: "현중", email: "ong" },
    { loginId: "hh", name: "희식", email: "hh" },
  ];
  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { loginId: u.loginId } });
    if (!exists) {
      const hash = await bcrypt.hash(u.loginId, 10);
      await prisma.user.create({
        data: { ...u, password: hash, role: "Editor", mustChangePassword: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
