/**
 * SQLite → PostgreSQL 데이터 마이그레이션 스크립트
 * 사용법: npx tsx scripts/migrate-to-postgres.ts
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

const SQLITE_PATH = path.join(__dirname, "..", "prisma", "dev.db");
const POSTGRES_URL = process.env.DATABASE_URL;

if (!POSTGRES_URL) {
  console.error("DATABASE_URL 환경변수가 필요합니다. .env 파일을 확인하세요.");
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient({ datasources: { db: { url: POSTGRES_URL } } });

function getAll(table: string) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
}

async function migrate() {
  console.log("=== SQLite → PostgreSQL 마이그레이션 시작 ===\n");
  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log(`PostgreSQL: ${POSTGRES_URL?.replace(/:[^@]+@/, ":***@")}\n`);

  // 1. Users
  const users = getAll("User");
  console.log(`Users: ${users.length}개`);
  for (const u of users) {
    await prisma.user.upsert({
      where: { loginId: u.loginId },
      update: {},
      create: {
        id: u.id,
        loginId: u.loginId,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        mustChangePassword: Boolean(u.mustChangePassword),
        avatar: u.avatar,
      },
    });
  }
  console.log("  ✓ Users 완료");

  // 2. Projects
  const projects = getAll("Project");
  console.log(`Projects: ${projects.length}개`);
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
      },
    });
  }
  console.log("  ✓ Projects 완료");

  // 3. Applications
  const apps = getAll("Application");
  console.log(`Applications: ${apps.length}개`);
  for (const a of apps) {
    await prisma.application.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        name: a.name,
        command: a.command,
        icon: a.icon,
      },
    });
  }
  console.log("  ✓ Applications 완료");

  // 4. Milestones (부모 먼저, 자식 나중)
  const milestones = getAll("Milestone");
  const parents = milestones.filter((m) => !m.parentId);
  const children = milestones.filter((m) => m.parentId);
  console.log(`Milestones: ${milestones.length}개 (부모 ${parents.length} + 자식 ${children.length})`);
  for (const m of [...parents, ...children]) {
    await prisma.milestone.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        assignee: m.assignee,
        color: m.color,
        startDate: m.startDate,
        endDate: m.endDate,
        priority: m.priority || "중",
        progress: m.progress || 0,
        order: m.order || 0,
        parentId: m.parentId,
        projectId: m.projectId,
      },
    });
  }
  console.log("  ✓ Milestones 완료");

  // 5. Tasks
  const tasks = getAll("Task");
  console.log(`Tasks: ${tasks.length}개`);
  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        order: t.order || 0,
        projectId: t.projectId,
        assigneeId: t.assigneeId,
      },
    });
  }
  console.log("  ✓ Tasks 완료");

  // 6. Demos
  const demos = getAll("Demo");
  console.log(`Demos: ${demos.length}개`);
  for (const d of demos) {
    await prisma.demo.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        scenario: d.scenario || "",
        type: d.type || "link",
        link: d.link,
        applicationId: d.applicationId,
        order: d.order || 0,
        projectId: d.projectId,
      },
    });
  }
  console.log("  ✓ Demos 완료");

  // 7. WeeklyReports
  const reports = getAll("WeeklyReport");
  console.log(`WeeklyReports: ${reports.length}개`);
  for (const r of reports) {
    await prisma.weeklyReport.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        weekDate: r.weekDate,
        weekLabel: r.weekLabel,
        projectId: r.projectId,
      },
    });
  }
  console.log("  ✓ WeeklyReports 완료");

  // 8. WeeklyEntries
  const entries = getAll("WeeklyEntry");
  console.log(`WeeklyEntries: ${entries.length}개`);
  for (const e of entries) {
    await prisma.weeklyEntry.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        lastWeek: e.lastWeek || "",
        thisWeek: e.thisWeek || "",
        issues: e.issues || "",
        issueIds: e.issueIds || "",
        reportId: e.reportId,
        milestoneId: e.milestoneId,
      },
    });
  }
  console.log("  ✓ WeeklyEntries 완료");

  console.log("\n=== 마이그레이션 완료 ===");
  await prisma.$disconnect();
  sqlite.close();
}

migrate().catch((e) => {
  console.error("마이그레이션 실패:", e);
  process.exit(1);
});
