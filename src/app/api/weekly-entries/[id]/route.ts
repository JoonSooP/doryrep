import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();
  const entry = await prisma.weeklyEntry.update({ where: { id }, data: body });
  return NextResponse.json(entry);
}
