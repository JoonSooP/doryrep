import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    const issues = await prisma.issue.findMany({
      where: { projectId },
      orderBy: [{ registeredAt: "asc" }, { number: "asc" }],
    });
    return NextResponse.json(issues);
  } catch (e) {
    console.error("GET /api/issues error:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId } = body;
  const maxNumber = await prisma.issue.aggregate({
    where: { projectId },
    _max: { number: true },
  });
  const issue = await prisma.issue.create({
    data: {
      ...body,
      number: (maxNumber._max.number ?? 0) + 1,
    },
  });
  return NextResponse.json(issue, { status: 201 });
}
