"use client";

import type { ActionItem } from "@/types";

const PRIORITY_LABEL: Record<string, string> = {
  "상": "text-red-600 dark:text-red-400",
  "중": "text-amber-600 dark:text-amber-400",
  "하": "text-slate-500 dark:text-slate-400",
};
const STATUS_DOT: Record<string, string> = {
  "Open": "bg-slate-400",
  "In-Progress": "bg-blue-500",
  "Review": "bg-amber-500",
  "Pending": "bg-orange-500",
  "Closed": "bg-emerald-500",
};

export function ActionItemCard({
  item,
  onDragStart,
  onEdit,
  canEdit = true,
}: {
  item: ActionItem;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onEdit?: (item: ActionItem) => void;
  canEdit?: boolean;
}) {
  const p = item.priority || "중";
  const lines = item.description.split("\n");
  const firstLine = lines[0] ?? "";
  const rest = lines.slice(1).join("\n");
  return (
    <div
      draggable={canEdit}
      onDragStart={canEdit && onDragStart ? (e) => onDragStart(e, item.id) : undefined}
      className={`group relative bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2.5 mb-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-200 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="수정"
        >
          &#9998;
        </button>
      )}
      {item.category && (
        <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate pr-6 mb-0.5">{item.category}</div>
      )}
      <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug pr-6">{firstLine}</h4>
      {rest && (
        <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-snug">{rest}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className={`font-medium ${PRIORITY_LABEL[p]}`}>● {p}</span>
        {item.assignee && <span className="ml-auto">{item.assignee}</span>}
      </div>
    </div>
  );
}
