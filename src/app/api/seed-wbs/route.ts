import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const projectId = "cmnvqlrd30006n8b1x7cn75x9";

  // 기존 마일스톤 삭제
  await prisma.milestone.deleteMany({ where: { projectId } });

  // 1. 공통
  const common = await prisma.milestone.create({
    data: { title: "공통", assignee: "박준수M", color: "#f3e8ff", projectId, order: 0 },
  });
  const commonChildren = [
    { title: "As-is 분석", startDate: "2026-02-03", endDate: "2026-02-21", order: 0 },
    { title: "Infra / Archi 분석 설계", startDate: "2026-02-17", endDate: "2026-03-07", order: 1 },
    { title: "개발환경 구성", startDate: "2026-03-03", endDate: "2026-03-14", order: 2 },
    { title: "운영환경 구성", startDate: "2026-03-10", endDate: "2026-03-28", order: 3 },
    { title: "중간보고", startDate: "2026-04-18", endDate: "2026-04-18", order: 4 },
    { title: "Infra 운영이관", startDate: "2026-05-19", endDate: "2026-06-06", order: 5 },
    { title: "Infra 운영", startDate: "2026-06-09", endDate: "2026-07-11", order: 6 },
    { title: "시연", startDate: "2026-05-26", endDate: "2026-06-06", order: 7 },
    { title: "종료보고(1차)", startDate: "2026-07-25", endDate: "2026-07-25", order: 8 },
  ];
  for (const c of commonChildren) {
    await prisma.milestone.create({
      data: { ...c, parentId: common.id, projectId },
    });
  }

  // 2. SKMS Agent
  const skms = await prisma.milestone.create({
    data: { title: "1. SKMS Agent", assignee: "선유경 팀장/김선빈M", color: "#dbeafe", projectId, order: 1 },
  });
  const skmsChildren = [
    { title: "요구사항 정의", startDate: "2026-02-10", endDate: "2026-02-21", order: 0 },
    { title: "분석/설계", startDate: "2026-02-24", endDate: "2026-03-14", order: 1 },
    { title: "개발 - Iteration 1", startDate: "2026-03-03", endDate: "2026-03-28", order: 2 },
    { title: "개발 - Iteration 2", startDate: "2026-03-31", endDate: "2026-04-25", order: 3 },
    { title: "개발환경 구성", startDate: "2026-03-03", endDate: "2026-03-21", order: 4 },
    { title: "개발 - Iteration 3", startDate: "2026-04-28", endDate: "2026-05-16", order: 5 },
    { title: "운영환경 검증/시연", startDate: "2026-05-12", endDate: "2026-05-30", order: 6 },
    { title: "오픈", startDate: "2026-06-02", endDate: "2026-06-06", order: 7 },
    { title: "안정화", startDate: "2026-06-09", endDate: "2026-07-04", order: 8 },
  ];
  for (const c of skmsChildren) {
    await prisma.milestone.create({
      data: { ...c, parentId: skms.id, projectId },
    });
  }

  // 3. 그룹 보안 수준 진단
  const security = await prisma.milestone.create({
    data: { title: "2. 그룹 보안 수준 진단", assignee: "문기식 팀장/용현종M", color: "#fef9c3", projectId, order: 2 },
  });
  const securityChildren = [
    { title: "분석", startDate: "2026-02-17", endDate: "2026-03-07", order: 0 },
    { title: "개발1 - AX 데이터 기준", startDate: "2026-03-03", endDate: "2026-03-21", order: 1 },
    { title: "1차시연", startDate: "2026-03-24", endDate: "2026-04-04", order: 2 },
    { title: "개발2 - 멤버사 데이터 수집", startDate: "2026-03-10", endDate: "2026-04-11", order: 3 },
    { title: "테스트/1차", startDate: "2026-04-07", endDate: "2026-04-18", order: 4 },
    { title: "개발3 - 고도화, 안정화", startDate: "2026-04-21", endDate: "2026-05-16", order: 5 },
    { title: "2차시연", startDate: "2026-05-19", endDate: "2026-05-30", order: 6 },
    { title: "운영전환", startDate: "2026-06-02", endDate: "2026-06-20", order: 7 },
  ];
  for (const c of securityChildren) {
    await prisma.milestone.create({
      data: { ...c, parentId: security.id, projectId },
    });
  }

  // 4. PR Agent
  const pr = await prisma.milestone.create({
    data: { title: "3. PR Agent", assignee: "선유경 팀장/장원영M", color: "#dcfce7", projectId, order: 3 },
  });
  const prChildren = [
    { title: "분석", startDate: "2026-02-17", endDate: "2026-03-07", order: 0 },
    { title: "설계", startDate: "2026-03-03", endDate: "2026-03-14", order: 1 },
    { title: "개발1 - 매체 모니터링(국내/국외)", startDate: "2026-03-03", endDate: "2026-04-18", order: 2 },
    { title: "개발환경 구성", startDate: "2026-03-10", endDate: "2026-03-21", order: 3 },
    { title: "개발2 - 매체 논조 분석&매체 현황 리포트", startDate: "2026-04-21", endDate: "2026-05-16", order: 4 },
    { title: "개발4 - 사작시 위기관리", startDate: "2026-05-05", endDate: "2026-05-30", order: 5 },
    { title: "통합테스트", startDate: "2026-05-26", endDate: "2026-06-06", order: 6 },
    { title: "운영환경 구축", startDate: "2026-06-02", endDate: "2026-06-13", order: 7 },
    { title: "시연", startDate: "2026-05-26", endDate: "2026-06-06", order: 8 },
    { title: "안정화", startDate: "2026-06-16", endDate: "2026-07-11", order: 9 },
  ];
  for (const c of prChildren) {
    await prisma.milestone.create({
      data: { ...c, parentId: pr.id, projectId },
    });
  }

  return NextResponse.json({ ok: true });
}
