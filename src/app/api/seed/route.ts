import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const emails = ["minsu@example.com", "jieun@example.com", "seoyeon@example.com"];
  const names = ["김민수", "이지은", "박서연"];
  let created = 0;
  for (let i = 0; i < emails.length; i++) {
    const existing = await prisma.user.findUnique({ where: { email: emails[i] } });
    if (!existing) {
      await prisma.user.create({ data: { name: names[i], email: emails[i] } });
      created++;
    }
  }
  const existingApp = await prisma.application.findUnique({ where: { name: "Telegram" } });
  if (!existingApp) {
    await prisma.application.create({
      data: { name: "Telegram", command: "open -a Telegram" },
    });
  }

  return NextResponse.json({ created });
}
