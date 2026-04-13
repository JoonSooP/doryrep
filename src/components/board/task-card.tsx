"use client";

import { TaskWithAssignee } from "@/types";

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
  canEdit = true,
}: {
  task: TaskWithAssignee;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  canEdit?: boolean;
}) {
  return (
    <div
      draggable={canEdit}
      onDragStart={canEdit ? (e) => onDragStart(e, task.id) : undefined}
      className={`bg-white dark:bg-gray-700 rounded-lg border dark:border-gray-600 p-3 mb-2 shadow-sm hover:shadow-md transition-shadow ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white flex-1">{task.title}</h4>
        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-blue-500 text-base w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              &#9998;
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-500 text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              &times;
            </button>
          </div>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
      )}
      {task.assignee && (
        <div className="mt-2 flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] flex items-center justify-center font-medium">
            {task.assignee.name[0]}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{task.assignee.name}</span>
        </div>
      )}
    </div>
  );
}
