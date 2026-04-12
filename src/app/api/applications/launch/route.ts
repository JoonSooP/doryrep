import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { applicationId } = await req.json();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) {
    return NextResponse.json({ error: "앱을 찾을 수 없습니다" }, { status: 404 });
  }

  // Vercel 서버리스 환경에서는 exec 불가
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "클라우드 환경에서는 앱 실행이 지원되지 않습니다. 로컬 환경에서 사용해 주세요." }, { status: 400 });
  }

  const { exec } = await import("child_process");
  return new Promise<NextResponse>((resolve) => {
    exec(app.command, (error) => {
      if (error) {
        resolve(NextResponse.json({ error: `실행 실패: ${error.message}` }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, app: app.name }));
      }
    });
  });
}
