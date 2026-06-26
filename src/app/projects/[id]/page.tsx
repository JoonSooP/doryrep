"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MilestoneList } from "@/components/milestones/milestone-list";
import { WeeklyReport } from "@/components/weekly/weekly-report";
import { KanbanBoard } from "@/components/board/kanban-board";
import { DemoList } from "@/components/demos/demo-list";
import { IssueList } from "@/components/issues/issue-list";
import { ActionItemList } from "@/components/action-items/action-item-list";
import { ActionItemGantt } from "@/components/action-items/action-item-gantt";
import { ProjectMembers } from "@/components/projects/project-members";
import { useAuth, useCanEdit } from "@/contexts/auth-context";

type Tab = "milestone" | "weekly" | "action" | "actionGantt" | "kanban" | "issue" | "demo";

const TABS: { key: Tab; label: string }[] = [
  { key: "milestone", label: "프로젝트 일정" },
  { key: "weekly", label: "Weekly" },
  { key: "action", label: "Action Item" },
  { key: "actionGantt", label: "Gantt Chart" },
  { key: "kanban", label: "칸반보드" },
  { key: "issue", label: "Issue Mgmt" },
  { key: "demo", label: "시연" },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const canManageMembers = canEdit || user?.role === "Admin";
  const [projectName, setProjectName] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("milestone");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProjectName(data.name); });
  }, [id]);

  if (forbidden) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-1">접근 권한이 없습니다</p>
        <p className="text-sm text-gray-400">이 프로젝트의 멤버가 아닙니다. Admin에게 문의하세요.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">
          프로젝트
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{projectName}</h1>
      </div>

      {canManageMembers && <ProjectMembers projectId={id} />}

      <div className="flex items-end gap-5 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-0.5 py-3 text-[13px] font-semibold tracking-tight transition-colors ${
              tab === t.key
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {tab === "milestone" && <MilestoneList projectId={id} />}
      {tab === "weekly" && <WeeklyReport projectId={id} onNavigateToIssue={() => setTab("issue")} />}
      <div style={{ display: tab === "action" ? "block" : "none" }}><ActionItemList projectId={id} /></div>
      <div style={{ display: tab === "actionGantt" ? "block" : "none" }}><ActionItemGantt projectId={id} /></div>
      {tab === "issue" && <IssueList projectId={id} />}
      <div style={{ display: tab === "kanban" ? "block" : "none" }}><KanbanBoard projectId={id} /></div>
      {tab === "demo" && <DemoList projectId={id} />}
    </div>
  );
}
