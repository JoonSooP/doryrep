import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function parseDemoJson(demo: any) {
  return {
    ...demo,
    images: JSON.parse(demo.images || "[]"),
    actions: JSON.parse(demo.actions || "[]"),
  };
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.scenario !== undefined) data.scenario = body.scenario;
  if (body.order !== undefined) data.order = body.order;
  if (body.type !== undefined) data.type = body.type;
  if (body.link !== undefined) data.link = body.link;
  if (body.image !== undefined) data.image = body.image;
  if (body.applicationId !== undefined) data.applicationId = body.applicationId;
  if (body.images !== undefined) data.images = JSON.stringify(body.images);
  if (body.actions !== undefined) data.actions = JSON.stringify(body.actions);

  const demo = await prisma.demo.update({ where: { id }, data });
  return NextResponse.json(parseDemoJson(demo));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.demo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
