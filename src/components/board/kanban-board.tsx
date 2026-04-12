"use client";

import { useEffect, useRef, useState } from "react";
import { Column } from "./column";
import { TaskForm } from "../tasks/task-form";
import { useCanEdit } from "@/contexts/auth-context";
import { useBoardStore } from "@/stores/board-store";
import { TASK_STATUSES, TaskStatus, TaskWithAssignee } from "@/types";

export function KanbanBoard({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const { tasks, setTasks, addTask, updateTask, removeTask, getTasksByStatus, moveTask } =
    useBoardStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithAssignee | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("TODO");
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []));
  }, [projectId, setTasks]);

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
    draggingId.current = taskId;
  };

  const handleDrop = async (newStatus: TaskStatus) => {
    const taskId = draggingId.current;
    if (!taskId) return;
    draggingId.current = null;

    const tasksInColumn = getTasksByStatus(newStatus);
    const newOrder = tasksInColumn.length;

    moveTask(taskId, newStatus, newOrder);
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status: newStatus, order: newOrder }),
    });
  };

  const handleAddTask = (status: TaskStatus) => {
    setDefaultStatus(status);
    setEditingTask(null);
    setModalOpen(true);
  };

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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            canEdit={canEdit}
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
    </>
  );
}
