import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json(null);
  return NextResponse.json(user);
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("userId");
  return NextResponse.json({ ok: true });
}
