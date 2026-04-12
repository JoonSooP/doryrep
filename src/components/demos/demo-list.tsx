"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";

type AppInfo = { id: string; name: string; command: string };

type Demo = {
  id: string;
  title: string;
  scenario: string;
  type: string;
  link: string | null;
  applicationId: string | null;
  application: AppInfo | null;
  order: number;
};

// [Web] 태그를 뱃지로 변환하여 렌더링
function renderScenarioLine(line: string, idx: number) {
  // 번호가 있는 줄 (1), 2) 등) → 볼드 처리
  const isNumbered = /^\d+\)/.test(line.trim());
  // [Web] 또는 [App] 태그 치환
  const parts = line.split(/(\[Web\]|\[App\])/g);

  return (
    <div key={idx} className={`${isNumbered ? "flex items-start gap-1.5 mt-1" : "ml-0"}`}>
      {parts.map((part, i) => {
        if (part === "[Web]") {
          return (
            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
              <span>🌐</span> Web
            </span>
          );
        }
        if (part === "[App]") {
          return (
            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
              <span>📱</span> App
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function ScenarioView({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-0.5 text-sm text-gray-700">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // 섹션 제목 (숫자 + 볼드 텍스트)
        const sectionMatch = trimmed.match(/^[①②③④⑤⑥⑦⑧⑨⑩]\s+(.+)/);
        if (sectionMatch) {
          return (
            <div key={i} className="flex items-center gap-2 mt-3 mb-1">
              <span className="text-base">{trimmed[0]}</span>
              <h4 className="font-bold text-gray-900 text-base">{sectionMatch[1]}</h4>
            </div>
          );
        }

        // 목적 줄
        if (trimmed.startsWith("- 목적")) {
          return <p key={i} className="text-gray-600 ml-4">{trimmed}</p>;
        }

        // 주요 시연 기능 헤더
        if (trimmed.startsWith("- 주요")) {
          return <p key={i} className="text-gray-800 font-semibold ml-4 mt-2">{trimmed.replace("- ", "")}</p>;
        }

        // 번호 항목 (1), 2) 등)
        if (/^\d+\)/.test(trimmed)) {
          return (
            <div key={i} className="ml-8">
              {renderScenarioLine(trimmed, i)}
            </div>
          );
        }

        return <p key={i} className="text-gray-600 ml-4">{trimmed}</p>;
      })}
    </div>
  );
}

export function DemoList({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState<Demo | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [type, setType] = useState<"link" | "app">("link");
  const [link, setLink] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const draggingIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const load = () => {
    fetch(`/api/demos?projectId=${projectId}`)
      .then((r) => r.json())
      .then(setDemos);
  };

  const loadApps = () => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then(setApps);
  };

  useEffect(() => { load(); loadApps(); }, [projectId]);

  const openCreate = () => {
    setEditingDemo(null);
    setTitle(""); setScenario(""); setType("link"); setLink(""); setApplicationId("");
    setModalOpen(true);
  };

  const openEdit = (demo: Demo) => {
    setEditingDemo(demo);
    setTitle(demo.title);
    setScenario(demo.scenario || "");
    setType(demo.type as "link" | "app");
    setLink(demo.link ?? "");
    setApplicationId(demo.applicationId ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === "app" && !applicationId) return;

    const payload = {
      title: title.trim(),
      scenario: scenario.trim(),
      type,
      link: type === "link" ? (link.trim() || null) : null,
      applicationId: type === "app" ? applicationId : null,
    };

    if (editingDemo) {
      await fetch(`/api/demos/${editingDemo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, projectId }),
      });
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/demos/${id}`, { method: "DELETE" });
    load();
  };

  const handleLaunchApp = async (demo: Demo) => {
    if (!demo.applicationId) return;
    const res = await fetch("/api/applications/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: demo.applicationId }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "앱 실행에 실패했습니다");
    }
  };

  const handleDragStart = (idx: number) => { draggingIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (targetIdx: number) => {
    const fromIdx = draggingIdx.current;
    draggingIdx.current = null;
    setDragOverIdx(null);
    if (fromIdx === null || fromIdx === targetIdx) return;
    const reordered = [...demos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setDemos(reordered);
    await Promise.all(
      reordered.map((d, i) =>
        fetch(`/api/demos/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: i }) })
      )
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => prev === id ? null : id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{demos.length}개 주제</span>
        {canEdit && (
          <button onClick={openCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + 주제 추가
          </button>
        )}
      </div>

      {demos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
          <p className="mb-1">등록된 시연 주제가 없습니다</p>
          <p className="text-sm">주제를 추가해 보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demos.map((demo, idx) => {
            const isExpanded = expandedId === demo.id;
            return (
              <div
                key={demo.id}
                draggable={canEdit}
                onDragStart={canEdit ? () => handleDragStart(idx) : undefined}
                onDragOver={canEdit ? (e) => handleDragOver(e, idx) : undefined}
                onDragLeave={canEdit ? () => setDragOverIdx(null) : undefined}
                onDrop={canEdit ? () => handleDrop(idx) : undefined}
                onDragEnd={canEdit ? () => { draggingIdx.current = null; setDragOverIdx(null); } : undefined}
                className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${
                  dragOverIdx === idx ? "ring-2 ring-blue-300 scale-[1.005]" : ""
                }`}
              >
                {/* 카드 헤더 */}
                <div
                  className={`flex items-center gap-3 p-4 cursor-pointer ${canEdit ? "" : ""}`}
                  onClick={() => toggleExpand(demo.id)}
                >
                  {canEdit && <span className="text-gray-300 text-xs select-none cursor-grab">&#9776;</span>}
                  <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                  <h4 className="font-semibold text-gray-900 flex-1">{demo.title}</h4>

                  {/* 실행 방식 뱃지 */}
                  {demo.type === "link" && demo.link && (
                    <a
                      href={demo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🌐 Web
                    </a>
                  )}
                  {demo.type === "app" && demo.application && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLaunchApp(demo); }}
                      className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      📱 {demo.application.name}
                    </button>
                  )}

                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(demo); }}
                        className="text-gray-400 hover:text-blue-500 text-base w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50"
                      >
                        &#9998;
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(demo.id); }}
                        className="text-gray-400 hover:text-red-500 text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-red-50"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                {/* 시나리오 펼침 영역 */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {demo.scenario ? (
                      <ScenarioView text={demo.scenario} />
                    ) : (
                      <div className="text-sm text-gray-400 border-t border-gray-100 pt-3">
                        시나리오가 없습니다. {canEdit && "수정 버튼을 눌러 시나리오를 작성해 보세요."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingDemo ? "주제 수정" : "새 주제"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="시연 주제 제목"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시연 시나리오</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={8}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono"
              placeholder={"① 진단 증빙 자료 제출 검증 및 평가\n- 목적 : 멤버사 별 다량의 증빙 자료 취합...\n- 주요 시연 기능\n1) [Web] 증빙 업로드 후 AI 유효성 검사\n2) [Web] AI 기반 예상 점수 확인"}
            />
            <p className="text-xs text-gray-400 mt-1">[Web], [App] 태그를 사용하면 뱃지로 표시됩니다. ①②③ 으로 섹션을 구분합니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">실행 방식</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("link")}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${type === "link" ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                링크
              </button>
              <button type="button" onClick={() => setType("app")}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${type === "app" ? "bg-purple-50 border-purple-300 text-purple-700 font-medium" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                앱 실행
              </button>
            </div>
          </div>
          {type === "link" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">링크</label>
              <input value={link} onChange={(e) => setLink(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="https://..." />
            </div>
          )}
          {type === "app" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
              {apps.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">등록된 앱이 없습니다.</p>
              ) : (
                <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">앱 선택</option>
                  {apps.map((app) => (<option key={app.id} value={app.id}>{app.name}</option>))}
                </select>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingDemo ? "수정" : "추가"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
