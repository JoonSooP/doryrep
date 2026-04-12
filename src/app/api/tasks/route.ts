import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const maxOrder = await prisma.task.aggregate({
    where: { projectId: body.projectId, status: body.status || "TODO" },
    _max: { order: true },
  });
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      assigneeId: body.assigneeId,
      status: body.status || "TODO",
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { assignee: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(task, { status: 201 });
}
