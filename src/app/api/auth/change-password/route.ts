import { prisma } from "@/lib/db";
import { getSession, validatePassword } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });

  const pwError = validatePassword(newPassword);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.id },
    data: { password: hash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
