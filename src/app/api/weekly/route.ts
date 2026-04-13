import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const reports = await prisma.weeklyReport.findMany({
    where: { projectId },
    orderBy: { weekDate: "desc" },
    include: {
      entries: {
        include: { milestone: { select: { id: true, title: true, color: true } } },
      },
    },
  });
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const { projectId, weekDate, weekLabel } = await req.json();

  // 과제 마일스톤 가져오기
  const parents = await prisma.milestone.findMany({
    where: { projectId, parentId: null },
    orderBy: { order: "asc" },
  });

  const report = await prisma.weeklyReport.create({
    data: {
      projectId,
      weekDate,
      weekLabel,
      entries: {
        create: parents.map((p) => ({
          milestoneId: p.id,
        })),
      },
    },
    include: {
      entries: {
        include: { milestone: { select: { id: true, title: true, color: true } } },
      },
    },
  });

  return NextResponse.json(report, { status: 201 });
}
