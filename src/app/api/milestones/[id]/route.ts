import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();
  const milestone = await prisma.milestone.update({ where: { id }, data: body });
  return NextResponse.json(milestone);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.milestone.deleteMany({ where: { parentId: id } });
  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
