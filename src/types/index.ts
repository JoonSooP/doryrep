export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "PENDING", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  IN_REVIEW: "검토 중",
  PENDING: "보류",
  DONE: "완료",
};

export type TaskWithAssignee = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  order: number;
  projectId: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; avatar: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionItem = {
  id: string;
  number: number;
  category: string;
  actionCategory: string;
  description: string;
  priority: string;
  requester: string;
  assignee: string;
  requestDate: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  workContent: string;
  status: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

export type Issue = {
  id: string;
  number: number;
  category: string;
  registeredAt: string;
  issueCode: string;
  description: string;
  issueType: string;
  assignee: string;
  responsible: string;
  result: string;
  status: string;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
};
