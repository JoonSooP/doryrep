"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectForm } from "./project-form";
import { useCanEdit } from "@/contexts/auth-context";
import { Project } from "@/types";

export function ProjectList() {
  const canEdit = useCanEdit();
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadProjects = () => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (data: { name: string; description: string }) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModalOpen(false);
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + 새 프로젝트
          </button>
        )}
      </div>
      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">프로젝트가 없습니다</p>
          <p className="text-sm">새 프로젝트를 만들어 시작하세요</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
              <div className="flex items-start justify-between">
                <Link href={`/projects/${p.id}`} className="flex-1">
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </Link>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-300 hover:text-red-500 ml-2"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span>{p._count?.tasks ?? 0}개 태스크</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <ProjectForm open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
    </div>
  );
}
