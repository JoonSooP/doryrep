import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "클라우드 환경에서는 백업이 지원되지 않습니다." }, { status: 400 });
  }

  const { exec } = await import("child_process");
  const path = await import("path");
  const scriptPath = path.join(process.cwd(), "scripts", "backup-db.sh");
  return new Promise<NextResponse>((resolve) => {
    exec(`bash "${scriptPath}" api`, (error, stdout) => {
      if (error) {
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, message: stdout.trim() }));
      }
    });
  });
}
