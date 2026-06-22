"use client";

import { useEffect, useRef, useState } from "react";
import { Column } from "./column";
import { TaskForm } from "../tasks/task-form";
import { Modal } from "../ui/modal";
import { useAuth, useCanEdit } from "@/contexts/auth-context";
import { useBoardStore } from "@/stores/board-store";
import { TASK_STATUSES, TaskStatus, TaskWithAssignee, ActionItem } from "@/types";

const ACTION_CATEGORIES = ["기능개선", "버그수정", "문서화", "협의/검토", "기타"] as const;
const PRIORITIES = ["상", "중", "하"] as const;

const AI_STATUS_TO_KANBAN: Record<string, TaskStatus> = {
  "Open": "TODO",
  "In-Progress": "IN_PROGRESS",
  "Review": "IN_REVIEW",
  "Pending": "PENDING",
  "Closed": "DONE",
};
const KANBAN_TO_AI_STATUS: Record<TaskStatus, string> = {
  "TODO": "Open",
  "IN_PROGRESS": "In-Progress",
  "IN_REVIEW": "Review",
  "PENDING": "Pending",
  "DONE": "Closed",
};

export function KanbanBoard({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const { user } = useAuth();
  const isHyeonup = user?.userType === "현업";
  const canEditAction = canEdit || isHyeonup;
  const canDragActionItem = (status: string) => canEdit || (isHyeonup && status === "Review");
  const { tasks, setTasks, addTask, updateTask, removeTask, getTasksByStatus, moveTask } =
    useBoardStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithAssignee | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("TODO");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<TaskStatus>("TODO");
  const [aiCategory, setAiCategory] = useState("");
  const [aiActionCategory, setAiActionCategory] = useState<string>(ACTION_CATEGORIES[0]);
  const [aiDescription, setAiDescription] = useState("");
  const [aiPriority, setAiPriority] = useState<string>("중");
  const [aiRequester, setAiRequester] = useState("");
  const [aiAssignee, setAiAssignee] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const filterInit = useRef(false);
  const draggingId = useRef<string | null>(null);
  const draggingKind = useRef<"task" | "action">("task");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []));
    fetch(`/api/action-items?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setActionItems(Array.isArray(data) ? data : []))
      .catch(() => setActionItems([]));
    fetch(`/api/milestones/categories?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d); })
      .catch(() => {});
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setUsers(d.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))); })
      .catch(() => {});
  }, [projectId, setTasks]);

  const allCategories = Array.from(new Set([...categories, ...actionItems.map((i) => i.category)].filter(Boolean)));
  const visibleActionItems = filterCategory ? actionItems.filter((i) => i.category === filterCategory) : actionItems;
  const actionItemsByStatus = (s: TaskStatus) =>
    visibleActionItems.filter((i) => (AI_STATUS_TO_KANBAN[i.status] ?? "TODO") === s);

  useEffect(() => {
    if (filterInit.current) return;
    const my = (user?.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (my.length === 1) {
      setFilterCategory(my[0]);
      filterInit.current = true;
    }
  }, [user]);

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
    draggingId.current = taskId;
    draggingKind.current = "task";
  };

  const handleActionDragStart = (_e: React.DragEvent, id: string) => {
    draggingId.current = id;
    draggingKind.current = "action";
  };

  const handleDrop = async (newStatus: TaskStatus) => {
    const id = draggingId.current;
    if (!id) return;
    const kind = draggingKind.current;
    draggingId.current = null;

    if (kind === "action") {
      const aiStatus = KANBAN_TO_AI_STATUS[newStatus];
      setActionItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: aiStatus } : i)));
      await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: aiStatus }),
      });
      return;
    }

    const tasksInColumn = getTasksByStatus(newStatus);
    const newOrder = tasksInColumn.length;
    moveTask(id, newStatus, newOrder);
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: id, status: newStatus, order: newOrder }),
    });
  };

  const handleAddTask = (status: TaskStatus) => {
    setAiStatus(status);
    setAiCategory("");
    setAiActionCategory(ACTION_CATEGORIES[0]);
    setAiDescription("");
    setAiPriority("중");
    setAiRequester(user?.name ?? "");
    setAiAssignee("");
    setAiModalOpen(true);
  };

  async function handleCreateActionItem() {
    if (!aiDescription.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const res = await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        category: aiCategory,
        actionCategory: aiActionCategory,
        description: aiDescription.trim(),
        priority: aiPriority,
        requester: aiRequester.trim(),
        assignee: aiAssignee.trim(),
        requestDate: today,
        startDate: today,
        endDate: weekLater,
        progress: 0,
        workContent: "",
        status: KANBAN_TO_AI_STATUS[aiStatus] ?? "Open",
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setActionItems((prev) => [...prev, created]);
      setAiModalOpen(false);
    }
  }

  const handleEditTask = (task: TaskWithAssignee) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    removeTask(id);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  };

  const handleSaveTask = async (data: {
    title: string;
    description: string;
    assigneeId: string;
    status: string;
  }) => {
    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      updateTask(updated);
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      const created = await res.json();
      addTask(created);
    }
    setModalOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">과제:</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">전체</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterCategory && (
          <span className="text-xs text-gray-400 ml-2">선택한 과제의 Action Item만 표시 (Task는 항상 표시)</span>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            actionItems={actionItemsByStatus(status)}
            onActionDragStart={handleActionDragStart}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            canEdit={canEdit}
            canEditAction={canEditAction}
            canDragActionItem={canDragActionItem}
          />
        ))}
      </div>
      <TaskForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        defaultStatus={defaultStatus}
      />

      <Modal open={aiModalOpen} onClose={() => setAiModalOpen(false)} title="Action Item 등록">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">과제</label>
            <select value={aiCategory} onChange={(e) => setAiCategory(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
              <option value="">선택</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              {!categories.includes("PMO") && <option value="PMO">PMO</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
            <select value={aiActionCategory} onChange={(e) => setAiActionCategory(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
              {ACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Action 설명</label>
            <textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" rows={3} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">우선순위</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => setAiPriority(p)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    aiPriority === p
                      ? (p === "상" ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400 font-medium"
                        : p === "중" ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400 font-medium"
                        : "bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 font-medium")
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >{p}</button>
              ))}
            </div>
          </div>

          {!isHyeonup && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">요청자</label>
                <select value={aiRequester} onChange={(e) => setAiRequester(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                  <option value="">선택</option>
                  {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">담당자</label>
                <select value={aiAssignee} onChange={(e) => setAiAssignee(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                  <option value="">선택</option>
                  {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {isHyeonup && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">요청자</label>
              <select value={aiRequester} onChange={(e) => setAiRequester(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100">
                <option value="">선택</option>
                {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setAiModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">취소</button>
            <button onClick={handleCreateActionItem} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">등록</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
