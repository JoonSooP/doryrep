import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const apps = await prisma.application.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { demos: true } } },
  });
  return NextResponse.json(apps);
}

export async function POST(req: NextRequest) {
  const { name, command, icon } = await req.json();
  const existing = await prisma.application.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 앱 이름입니다" }, { status: 409 });
  }
  const app = await prisma.application.create({ data: { name, command, icon } });
  return NextResponse.json(app, { status: 201 });
}
