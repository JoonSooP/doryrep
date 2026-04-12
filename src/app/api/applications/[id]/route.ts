import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();
  const app = await prisma.application.update({ where: { id }, data: body });
  return NextResponse.json(app);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.demo.updateMany({ where: { applicationId: id }, data: { applicationId: null, type: "link" } });
  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
