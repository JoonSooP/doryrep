"use client";

import { create } from "zustand";
import { TaskWithAssignee, TASK_STATUSES, TaskStatus } from "@/types";

type BoardState = {
  tasks: TaskWithAssignee[];
  loading: boolean;
  setTasks: (tasks: TaskWithAssignee[]) => void;
  addTask: (task: TaskWithAssignee) => void;
  updateTask: (task: TaskWithAssignee) => void;
  removeTask: (id: string) => void;
  getTasksByStatus: (status: TaskStatus) => TaskWithAssignee[];
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
};

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  loading: false,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  getTasksByStatus: (status) =>
    get()
      .tasks.filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order),
  moveTask: (taskId, newStatus, newOrder) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t
      ),
    })),
}));
