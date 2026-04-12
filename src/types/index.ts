export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  IN_REVIEW: "검토 중",
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

export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
};
