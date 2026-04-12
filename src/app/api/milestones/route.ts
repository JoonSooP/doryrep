import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest) {
  const { title, assignee, color, startDate, endDate, priority, progress, parentId, projectId } = await req.json();
  const maxOrder = await prisma.milestone.aggregate({
    where: { projectId, parentId: parentId || null },
    _max: { order: true },
  });
  const milestone = await prisma.milestone.create({
    data: {
      title,
      assignee: assignee || null,
      color: color || null,
      startDate: startDate || null,
      endDate: endDate || null,
      priority: priority || "중",
      progress: progress ?? 0,
      parentId: parentId || null,
      projectId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json(milestone, { status: 201 });
}
