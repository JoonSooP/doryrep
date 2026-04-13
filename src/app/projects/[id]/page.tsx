"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MilestoneList } from "@/components/milestones/milestone-list";
import { WeeklyReport } from "@/components/weekly/weekly-report";
import { KanbanBoard } from "@/components/board/kanban-board";
import { DemoList } from "@/components/demos/demo-list";
import { IssueList } from "@/components/issues/issue-list";

type Tab = "milestone" | "weekly" | "issue" | "kanban" | "demo";

const TABS: { key: Tab; label: string }[] = [
  { key: "milestone", label: "프로젝트 일정" },
  { key: "weekly", label: "Weekly" },
  { key: "issue", label: "Issue Mgmt" },
  { key: "kanban", label: "칸반보드" },
  { key: "demo", label: "시연" },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [projectName, setProjectName] = useState("");
  const [tab, setTab] = useState<Tab>("milestone");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setProjectName(data.name));
  }, [id]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">
          프로젝트
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{projectName}</h1>
      </div>

      <div className="flex gap-1 border-b dark:border-gray-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "milestone" && <MilestoneList projectId={id} />}
      {tab === "weekly" && <WeeklyReport projectId={id} />}
      {tab === "issue" && <IssueList projectId={id} />}
      {tab === "kanban" && <KanbanBoard projectId={id} />}
      {tab === "demo" && <DemoList projectId={id} />}
    </div>
  );
}
