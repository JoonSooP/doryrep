import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const me = await getSession();
  const where = me && me.role !== "Admin"
    ? { members: { some: { userId: me.id } } }
    : undefined;
  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const me = await getSession();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      members: me ? { create: { userId: me.id } } : undefined,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
