"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { AssigneeSelect } from "./assignee-select";
import { TaskWithAssignee, TASK_STATUSES, STATUS_LABELS, TaskStatus } from "@/types";

export function TaskForm({
  open,
  onClose,
  onSave,
  task,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; assigneeId: string; status: string }) => void;
  task: TaskWithAssignee | null;
  defaultStatus: TaskStatus;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState<string>(defaultStatus);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setAssigneeId(task.assigneeId ?? "");
      setStatus(task.status);
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setStatus(defaultStatus);
    }
  }, [task, defaultStatus, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description, assigneeId: assigneeId || "", status });
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "태스크 수정" : "새 태스크"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="태스크 제목"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="태스크 설명 (선택)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">담당자</label>
          <AssigneeSelect value={assigneeId} onChange={setAssigneeId} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            취소
          </button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {task ? "수정" : "생성"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
