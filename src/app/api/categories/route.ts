import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const grouped = req.nextUrl.searchParams.get("grouped");
  if (grouped) {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        milestones: {
          where: { parentId: null },
          select: { title: true },
          orderBy: { order: "asc" },
        },
      },
    });
    const data = projects.map((p) => ({
      projectId: p.id,
      projectName: p.name,
      categories: Array.from(new Set(p.milestones.map((m) => m.title).filter(Boolean))),
    }));
    return NextResponse.json(data);
  }
  const topLevel = await prisma.milestone.findMany({
    where: { parentId: null },
    select: { title: true },
    orderBy: { order: "asc" },
  });
  const titles = Array.from(new Set(topLevel.map((m) => m.title).filter(Boolean)));
  return NextResponse.json(titles);
}
