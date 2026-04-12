import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { loginId, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", user.id, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });

  return NextResponse.json({
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
}
