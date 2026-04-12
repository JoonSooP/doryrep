import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json([], { status: 400 });

  const topLevel = await prisma.milestone.findMany({
    where: { projectId, parentId: null },
    select: { title: true },
    orderBy: { order: "asc" },
  });

  const titles = [...new Set(topLevel.map((m) => m.title))];
  return NextResponse.json(titles);
}
