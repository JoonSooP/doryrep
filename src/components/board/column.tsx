"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { TaskWithAssignee, TaskStatus, STATUS_LABELS } from "@/types";

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  IN_REVIEW: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

export function Column({
  status,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDragStart,
  onDrop,
  canEdit = true,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: TaskWithAssignee) => void;
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (status: TaskStatus) => void;
  canEdit?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 min-w-[280px] w-[280px] flex flex-col max-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-gray-400">{tasks.length}</span>
        </div>
        {canEdit && (
          <button
            onClick={() => onAddTask(status)}
            className="text-gray-400 hover:text-blue-500 text-lg leading-none"
          >
            +
          </button>
        )}
      </div>
      <div
        onDragOver={canEdit ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
        onDragLeave={canEdit ? () => setDragOver(false) : undefined}
        onDrop={canEdit ? (e) => { e.preventDefault(); setDragOver(false); onDrop(status); } : undefined}
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
      </div>
    </div>
  );
}
