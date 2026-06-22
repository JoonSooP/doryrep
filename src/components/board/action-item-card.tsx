"use client";

import type { ActionItem } from "@/types";

export function ActionItemCard({
  item,
  onDragStart,
  canEdit = true,
}: {
  item: ActionItem;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  canEdit?: boolean;
}) {
  return (
    <div
      draggable={canEdit}
      onDragStart={canEdit && onDragStart ? (e) => onDragStart(e, item.id) : undefined}
      className={`bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/60 p-3 mb-2 shadow-sm ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-300">AI</span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{item.category}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{item.description}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {item.assignee && (
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] flex items-center justify-center font-medium">
              {item.assignee[0]}
            </span>
            <span>{item.assignee}</span>
          </div>
        )}
        <span className="ml-auto">{item.progress}%</span>
      </div>
    </div>
  );
}
