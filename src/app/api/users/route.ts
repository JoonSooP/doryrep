import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, loginId: true, name: true, email: true, role: true,
      mustChangePassword: true, _count: { select: { tasks: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { loginId, name, email, role } = await req.json();
  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 ID입니다" }, { status: 409 });
  }
  // 초기 비밀번호 = loginId
  const hash = await bcrypt.hash(loginId, 10);
  const user = await prisma.user.create({
    data: { loginId, name, email: email || loginId, password: hash, role: role || "Viewer", mustChangePassword: true },
  });
  return NextResponse.json(user, { status: 201 });
}
