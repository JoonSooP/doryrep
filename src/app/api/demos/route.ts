import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function parseDemoJson(demo: any) {
  return {
    ...demo,
    images: JSON.parse(demo.images || "[]"),
    actions: JSON.parse(demo.actions || "[]"),
  };
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const demos = await prisma.demo.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: { application: { select: { id: true, name: true, command: true } } },
  });
  return NextResponse.json(demos.map(parseDemoJson));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, scenario, type, link, image, images, actions, applicationId, projectId } = body;
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
      image: image || null,
      images: JSON.stringify(images || []),
      actions: JSON.stringify(actions || []),
      applicationId: type === "app" ? applicationId : null,
      projectId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { application: { select: { id: true, name: true, command: true } } },
  });
  return NextResponse.json(parseDemoJson(demo), { status: 201 });
}
