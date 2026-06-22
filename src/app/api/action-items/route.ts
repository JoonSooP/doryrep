import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    const items = await prisma.actionItem.findMany({
      where: { projectId },
      orderBy: [{ requestDate: "asc" }, { number: "asc" }],
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/action-items error:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId } = body;
  const maxNumber = await prisma.actionItem.aggregate({
    where: { projectId },
    _max: { number: true },
  });
  const item = await prisma.actionItem.create({
    data: {
      ...body,
      number: (maxNumber._max.number ?? 0) + 1,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
