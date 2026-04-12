import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const demos = await prisma.demo.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: { application: { select: { id: true, name: true, command: true } } },
  });
  return NextResponse.json(demos);
}

export async function POST(req: NextRequest) {
  const { title, scenario, type, link, applicationId, projectId } = await req.json();
  const maxOrder = await prisma.demo.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  const demo = await prisma.demo.create({
    data: {
      title,
      scenario: scenario || "",
      type: type || "link",
      link: type === "app" ? null : link,
      applicationId: type === "app" ? applicationId : null,
      projectId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { application: { select: { id: true, name: true, command: true } } },
  });
  return NextResponse.json(demo, { status: 201 });
}
