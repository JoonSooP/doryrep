import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, loginId: true, name: true, role: true, userType: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const member = await prisma.projectMember.create({
      data: { projectId: id, userId },
      include: { user: { select: { id: true, loginId: true, name: true, role: true, userType: true } } },
    });
    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 추가된 사용자입니다" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
  return NextResponse.json({ ok: true });
}
