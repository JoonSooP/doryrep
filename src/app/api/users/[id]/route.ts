import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();

  // 비밀번호 초기화 요청
  if (body.resetPassword) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "사용자 없음" }, { status: 404 });
    const hash = await bcrypt.hash(user.loginId, 10);
    await prisma.user.update({ where: { id }, data: { password: hash, mustChangePassword: true } });
    return NextResponse.json({ ok: true });
  }

  const { password, ...data } = body;
  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
