import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { taskId, status, order } = await req.json();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status, order },
    include: { assignee: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(task);
}
