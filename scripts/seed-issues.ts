import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_ID = "cmnvqlrd30006n8b1x7cn75x9";

const issues = [
  // 고용센터 전화응대 협업 Agent - row 1
  {
    number: 1,
    category: "고용센터 전화응대 협업 Agent",
    registeredAt: "2026-03-21",
    issueCode: "B-0317-001",
    description: "프로토타입 가능범위 결과보고기한 건의",
    assignee: "PMO",
    responsible: "Q이사",
    status: "이사급 프로토타입 결과보고기한 등 건의 완료",
    startDate: "2026-01-01",
    dueDate: "2026-03-21",
    completedDate: "2026-03-21",
    remarks: "완료",
  },
  // PMO - row 2
  {
    number: 2,
    category: "PMO",
    registeredAt: "2026-03-21",
    issueCode: "PMO-0321-001",
    description: "OJT 최소 기간 확보 건의",
    assignee: "",
    responsible: "",
    status: "",
    startDate: "2026-03-21",
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // 고용센터 전화응대 협업 Agent - row 3
  {
    number: 3,
    category: "고용센터 전화응대 협업 Agent",
    registeredAt: "2026-03-22",
    issueCode: "B-0300-002",
    description: "Private Cloud환경의 LLM 서버 가용성/안정성(Perf) - Azure/AWS 대비 상당한 차이",
    assignee: "",
    responsible: "",
    status: "동 유사 LLM 서비스 도입사례 및 성능비교 기초자료 리서치 자체 수행 중",
    startDate: "2026-03-18",
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // 고용센터 전화응대 협업 Agent - row 4
  {
    number: 4,
    category: "고용센터 전화응대 협업 Agent",
    registeredAt: "2026-03-25",
    issueCode: "B-0325-001",
    description: "(AWS)내 테스트환경에서의 테스트가능범위/기능방향(오션컨설팅)",
    assignee: "",
    responsible: "",
    status: "",
    startDate: null,
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // PMO - row 5
  {
    number: 5,
    category: "PMO",
    registeredAt: "2026-03-11",
    issueCode: "PMO-0311-001",
    description: "각 Agent별 시연환경이 차이 발생하여 기능성/인프라 관련 검토 필요",
    assignee: "",
    responsible: "",
    status: "",
    startDate: "2026-03-15",
    dueDate: "2026-04-15",
    completedDate: null,
    remarks: "",
  },
  // PMO - row 6
  {
    number: 6,
    category: "PMO",
    registeredAt: "2026-03-19",
    issueCode: "PMO-0319-001",
    description: "타 팀(Agent) 조치대상 기능화/리소스 공유 안내 및 프로세스 수립 필요",
    assignee: "",
    responsible: "",
    status: "",
    startDate: null,
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // PR Agent - row 7
  {
    number: 2,
    category: "PR Agent",
    registeredAt: "2026-03-15",
    issueCode: "B-0305-002",
    description: "작적 데이터 분석으로 전문 AP 적용 Compliance Issue 점검 관련\n- 보안 규정/가이드 준수 여부 및 데이터보호법 위반 리스크 점검\n- LM 학습용 데이터 적합성 기준 및 사용범위 합의 필요",
    assignee: "",
    responsible: "PM/설계자 리뷰팀 겸 프로세스 수립",
    status: "PR사업부 부서장/AI 전략실장에 사업부내 오피스 프로세스 수립",
    startDate: "2026-04-01",
    dueDate: "2026-04-25",
    completedDate: null,
    remarks: "",
  },
  // PR Agent - row 8
  {
    number: 3,
    category: "PR Agent",
    registeredAt: "2026-03-29",
    issueCode: "B-0305-003",
    description: "적격 데이터 분석으로 전문 AP 적용 Compliance Issue 점검 관련",
    assignee: "",
    responsible: "",
    status: "FR사업부 부서장/AI실장에 사업부내 오피스 프로세스 수립",
    startDate: "2026-03-29",
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // PR Agent - row 9
  {
    number: 5,
    category: "PR Agent",
    registeredAt: "2026-04-05",
    issueCode: "B-0305-004",
    description: "PR Agent 시연 시나리오 관련\n- Frosab's 검증 프로세스 LLM Outbound/AI 기존 검토프로세스\n- LM 학습용 데이터 적합성 기준 및 가용범위 합의 필요",
    assignee: "",
    responsible: "",
    status: "Frosab's 기반으로 데이터팀에 검증프로세스 수립 요청",
    startDate: "2026-04-05",
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // PR Agent - row 10
  {
    number: 6,
    category: "PR Agent",
    registeredAt: "2026-04-05",
    issueCode: "B-0407-001",
    description: "FR 항목 변경으로 전문 AP 적용 Compliance Issue 점검",
    assignee: "",
    responsible: "",
    status: "",
    startDate: null,
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
  // PMO - row 11
  {
    number: 7,
    category: "PMO",
    registeredAt: "2026-04-07",
    issueCode: "PMO-0408-001",
    description: "시연 환경 인프라 점검 및 네트워크 접속 테스트 / 가용범위 합의",
    assignee: "",
    responsible: "",
    status: "",
    startDate: null,
    dueDate: null,
    completedDate: null,
    remarks: "",
  },
];

async function main() {
  await prisma.issue.deleteMany({ where: { projectId: PROJECT_ID } });

  for (const issue of issues) {
    await prisma.issue.create({
      data: {
        ...issue,
        projectId: PROJECT_ID,
      },
    });
  }

  console.log(`Seeded ${issues.length} issues`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
