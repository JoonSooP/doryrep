"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { ActionItemCard } from "./action-item-card";
import { TaskWithAssignee, TaskStatus, STATUS_LABELS, ActionItem } from "@/types";

const STATUS_DOT_COLOR: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  PENDING: "bg-orange-500",
  DONE: "bg-emerald-500",
};
const STATUS_BG: Record<TaskStatus, string> = {
  TODO: "bg-slate-50 dark:bg-slate-900/30",
  IN_PROGRESS: "bg-blue-50/70 dark:bg-blue-900/20",
  IN_REVIEW: "bg-amber-50/70 dark:bg-amber-900/20",
  PENDING: "bg-orange-50/70 dark:bg-orange-900/20",
  DONE: "bg-emerald-50/70 dark:bg-emerald-900/20",
};

export function Column({
  status,
  tasks,
  actionItems = [],
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDragStart,
  onActionDragStart,
  onEditActionItem,
  onDrop,
  canEdit = true,
  canEditAction = canEdit,
  canDragActionItem,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  actionItems?: ActionItem[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: TaskWithAssignee) => void;
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onActionDragStart?: (e: React.DragEvent, id: string) => void;
  onEditActionItem?: (item: ActionItem) => void;
  onDrop: (status: TaskStatus) => void;
  canEdit?: boolean;
  canEditAction?: boolean;
  canDragActionItem?: (status: string) => boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className={`${STATUS_BG[status]} rounded-lg p-3 min-w-[320px] w-[320px] flex flex-col max-h-[calc(100vh-200px)] border border-gray-200/60 dark:border-gray-700/40`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLOR[status]}`} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">{tasks.length + actionItems.length}</span>
        </div>
        {canEditAction && (
          <button
            onClick={() => onAddTask(status)}
            className="text-gray-400 hover:text-blue-500 text-lg leading-none"
            title="Task 추가 (Action Item에 자동 반영)"
          >
            +
          </button>
        )}
      </div>
      <div
        onDragOver={canEditAction ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
        onDragLeave={canEditAction ? () => setDragOver(false) : undefined}
        onDrop={canEditAction ? (e) => { e.preventDefault(); setDragOver(false); onDrop(status); } : undefined}
        className={`flex-1 overflow-y-auto min-h-[100px] rounded-lg p-1 transition-colors ${
          dragOver ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-700" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onDragStart={onDragStart}
            canEdit={canEdit}
          />
        ))}
        {actionItems.map((item) => (
          <ActionItemCard
            key={`ai-${item.id}`}
            item={item}
            onDragStart={onActionDragStart}
            onEdit={canEditAction ? onEditActionItem : undefined}
            canEdit={canDragActionItem ? canDragActionItem(item.status) : canEditAction}
          />
        ))}
      </div>
    </div>
  );
}
