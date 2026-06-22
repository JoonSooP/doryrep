import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const topLevel = await prisma.milestone.findMany({
    where: { parentId: null },
    select: { title: true },
    orderBy: { order: "asc" },
  });
  const titles = Array.from(new Set(topLevel.map((m) => m.title).filter(Boolean)));
  return NextResponse.json(titles);
}
