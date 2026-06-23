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
      className={`group bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2.5 mb-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold tracking-wide text-blue-600 dark:text-blue-400 uppercase">Task</span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-[13px] text-gray-900 dark:text-gray-100 flex-1 leading-snug">{task.title}</h4>
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">{task.description}</p>
      )}
      {task.assignee && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] flex items-center justify-center font-medium border border-gray-200 dark:border-gray-600">
            {task.assignee.name[0]}
          </span>
          <span className="text-[11px] text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
        </div>
      )}
    </div>
  );
}
