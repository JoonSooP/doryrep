"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Modal } from "../ui/modal";
import { useCanEdit } from "@/contexts/auth-context";

type AppInfo = { id: string; name: string; command: string };
type DemoImage = { id: string; title: string; data: string; order: number };
type DemoAction = { id: string; type: "link" | "app"; label: string; link?: string; applicationId?: string; order: number };

type Demo = {
  id: string;
  title: string;
  scenario: string;
  images: DemoImage[];
  actions: DemoAction[];
  // legacy fields
  type: string;
  link: string | null;
  image: string | null;
  applicationId: string | null;
  application: AppInfo | null;
  order: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Scenario 렌더링 (기존 로직 유지) ──

function renderScenarioLine(line: string, idx: number) {
  const isNumbered = /^\d+\)/.test(line.trim());
  const parts = line.split(/(\[Web\]|\[App\])/g);
  return (
    <div key={idx} className={`${isNumbered ? "flex items-start gap-1.5 mt-1" : "ml-0"}`}>
      {parts.map((part, i) => {
        if (part === "[Web]") return <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 shrink-0"><span>🌐</span> Web</span>;
        if (part === "[App]") return <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 shrink-0"><span>📱</span> App</span>;
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function ScenarioView({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 text-sm text-gray-700">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        const sectionMatch = trimmed.match(/^[①②③④⑤⑥⑦⑧⑨⑩]\s+(.+)/);
        if (sectionMatch) return <div key={i} className="flex items-center gap-2 mt-3 mb-1"><span className="text-base">{trimmed[0]}</span><h4 className="font-bold text-gray-900 text-base">{sectionMatch[1]}</h4></div>;
        if (trimmed.startsWith("- 목적")) return <p key={i} className="text-gray-600 ml-4">{trimmed}</p>;
        if (trimmed.startsWith("- 주요")) return <p key={i} className="text-gray-800 font-semibold ml-4 mt-2">{trimmed.replace("- ", "")}</p>;
        if (/^\d+\)/.test(trimmed)) return <div key={i} className="ml-8">{renderScenarioLine(trimmed, i)}</div>;
        return <p key={i} className="text-gray-600 ml-4">{trimmed}</p>;
      })}
    </div>
  );
}

// ── 이미지 드롭존 (단일, 모달 내부용) ──

function ImageDropZone({ onAdd }: { onAdd: (data: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") onAdd(reader.result); };
    reader.readAsDataURL(file);
  }, [onAdd]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
      onPaste={(e) => { for (const item of Array.from(e.clipboardData.items)) { if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) processFile(f); break; } } }}
      tabIndex={0}
      onClick={() => fileRef.current?.click()}
      className={`rounded-lg border-2 border-dashed py-4 text-center text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${dragOver ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-300 bg-gray-50 text-gray-400"}`}
    >
      <p>이미지를 드래그하거나 클릭 / Ctrl+V 붙여넣기</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── 이미지 편집 목록 (모달 내부) ──

function ImageEditor({ images, onChange }: { images: DemoImage[]; onChange: (v: DemoImage[]) => void }) {
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const addImage = (data: string) => {
    onChange([...images, { id: uid(), title: "", data, order: images.length }]);
  };

  const updateTitle = (id: string, title: string) => {
    onChange(images.map((img) => img.id === id ? { ...img, title } : img));
  };

  const remove = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const handleDrop = (targetIdx: number) => {
    const fromIdx = dragIdx.current;
    dragIdx.current = null;
    setDragOverIdx(null);
    if (fromIdx === null || fromIdx === targetIdx) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onChange(reordered);
  };

  return (
    <div className="space-y-2">
      {images.map((img, idx) => (
        <div
          key={img.id}
          draggable
          onDragStart={() => { dragIdx.current = idx; }}
          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
          onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
          className={`flex gap-2 items-start border rounded-lg p-2 bg-gray-50 transition-all ${dragOverIdx === idx ? "ring-2 ring-blue-300" : ""}`}
        >
          <span className="text-gray-300 text-xs select-none cursor-grab self-center shrink-0">&#9776;</span>
          <img src={img.data} alt="" className="w-20 h-14 object-cover rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <input
              value={img.title}
              onChange={(e) => updateTitle(img.id, e.target.value)}
              placeholder={`이미지 ${idx + 1} 제목`}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <button type="button" onClick={() => remove(img.id)} className="text-red-400 hover:text-red-600 text-lg shrink-0">&times;</button>
        </div>
      ))}
      <ImageDropZone onAdd={addImage} />
    </div>
  );
}

// ── 액션(링크/앱) 편집 목록 (모달 내부) ──

function ActionEditor({ actions, onChange, apps }: { actions: DemoAction[]; onChange: (v: DemoAction[]) => void; apps: AppInfo[] }) {
  const add = () => {
    onChange([...actions, { id: uid(), type: "link", label: "", link: "", order: actions.length }]);
  };

  const update = (id: string, patch: Partial<DemoAction>) => {
    onChange(actions.map((a) => a.id === id ? { ...a, ...patch } : a));
  };

  const remove = (id: string) => {
    onChange(actions.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-2">
      {actions.map((action, idx) => (
        <div key={action.id} className="flex gap-2 items-center border rounded-lg p-2 bg-gray-50">
          <select
            value={action.type}
            onChange={(e) => update(action.id, { type: e.target.value as "link" | "app" })}
            className="border rounded px-2 py-1 text-sm shrink-0 w-20"
          >
            <option value="link">링크</option>
            <option value="app">앱</option>
          </select>
          <input
            value={action.label}
            onChange={(e) => update(action.id, { label: e.target.value })}
            placeholder="표시명"
            className="border rounded px-2 py-1 text-sm w-24 shrink-0"
          />
          {action.type === "link" ? (
            <input
              value={action.link || ""}
              onChange={(e) => update(action.id, { link: e.target.value })}
              placeholder="https://..."
              className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
            />
          ) : (
            <select
              value={action.applicationId || ""}
              onChange={(e) => update(action.id, { applicationId: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
            >
              <option value="">앱 선택</option>
              {apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          )}
          <button type="button" onClick={() => remove(action.id)} className="text-red-400 hover:text-red-600 text-lg shrink-0">&times;</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-blue-600 hover:text-blue-800">+ 실행 방식 추가</button>
    </div>
  );
}

// ── 메인 DemoList ──

export function DemoList({ projectId }: { projectId: string }) {
  const canEdit = useCanEdit();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState<Demo | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // lightbox
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [formImages, setFormImages] = useState<DemoImage[]>([]);
  const [formActions, setFormActions] = useState<DemoAction[]>([]);

  const draggingIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const load = () => { fetch(`/api/demos?projectId=${projectId}`).then((r) => r.json()).then(setDemos); };
  const loadApps = () => { fetch("/api/applications").then((r) => r.json()).then(setApps); };

  useEffect(() => { load(); loadApps(); }, [projectId]);

  const openCreate = () => {
    setEditingDemo(null);
    setTitle(""); setScenario(""); setFormImages([]); setFormActions([]);
    setModalOpen(true);
  };

  const openEdit = (demo: Demo) => {
    setEditingDemo(demo);
    setTitle(demo.title);
    setScenario(demo.scenario || "");
    setFormImages(demo.images || []);
    setFormActions(demo.actions || []);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      scenario: scenario.trim(),
      images: formImages,
      actions: formActions,
      // legacy compat
      type: formActions[0]?.type || "link",
      link: formActions.find((a) => a.type === "link")?.link || null,
      applicationId: formActions.find((a) => a.type === "app")?.applicationId || null,
      image: formImages[0]?.data || null,
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

  const handleLaunchApp = async (applicationId: string) => {
    const res = await fetch("/api/applications/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "앱 실행에 실패했습니다");
    }
  };

  // card-level image drop
  const handleCardImageDrop = async (e: React.DragEvent, demo: Demo) => {
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    e.preventDefault();
    e.stopPropagation();
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const newImages = [...demo.images, { id: uid(), title: "", data: reader.result, order: demo.images.length }];
        await fetch(`/api/demos/${demo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: newImages }),
        });
        load();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragStart = (idx: number) => { draggingIdx.current = idx; };
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{demos.length}개 주제</span>
        {canEdit && (
          <button onClick={openCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ 주제 추가</button>
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
            const demoActions = demo.actions?.length > 0 ? demo.actions : (
              demo.type === "link" && demo.link ? [{ id: "legacy", type: "link" as const, label: "Web", link: demo.link, order: 0 }] :
              demo.type === "app" && demo.application ? [{ id: "legacy", type: "app" as const, label: demo.application.name, applicationId: demo.applicationId!, order: 0 }] : []
            );
            const demoImages = demo.images?.length > 0 ? demo.images : (demo.image ? [{ id: "legacy", title: "", data: demo.image, order: 0 }] : []);

            return (
              <div
                key={demo.id}
                draggable={canEdit}
                onDragStart={canEdit ? () => handleDragStart(idx) : undefined}
                onDragOver={canEdit ? (e) => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
                onDragLeave={canEdit ? () => setDragOverIdx(null) : undefined}
                onDrop={canEdit ? (e) => {
                  if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith("image/")) {
                    handleCardImageDrop(e, demo);
                  } else { handleDrop(idx); }
                } : undefined}
                onDragEnd={canEdit ? () => { draggingIdx.current = null; setDragOverIdx(null); } : undefined}
                className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${dragOverIdx === idx ? "ring-2 ring-blue-300 scale-[1.005]" : ""}`}
              >
                {/* 카드 헤더 */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId((prev) => prev === demo.id ? null : demo.id)}>
                  {canEdit && <span className="text-gray-300 text-xs select-none cursor-grab">&#9776;</span>}
                  <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                  <h4 className="font-semibold text-gray-900 flex-1">{demo.title}</h4>

                  {demoImages.length > 0 && <span className="text-xs text-gray-400">🖼️ {demoImages.length}</span>}

                  {/* 액션 뱃지들 */}
                  <div className="flex gap-1 shrink-0">
                    {demoActions.map((action) => (
                      action.type === "link" && action.link ? (
                        <a key={action.id} href={action.link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          🌐 {action.label || "Web"}
                        </a>
                      ) : action.type === "app" && action.applicationId ? (
                        <button key={action.id} onClick={(e) => { e.stopPropagation(); handleLaunchApp(action.applicationId!); }}
                          className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors">
                          📱 {action.label || "App"}
                        </button>
                      ) : null
                    ))}
                  </div>

                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(demo); }}
                        className="text-gray-400 hover:text-blue-500 text-base w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50">&#9998;</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(demo.id); }}
                        className="text-gray-400 hover:text-red-500 text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-red-50">&times;</button>
                    </div>
                  )}
                </div>

                {/* 펼침 영역: 시나리오 + 이미지 */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {demo.scenario ? (
                      <ScenarioView text={demo.scenario} />
                    ) : demoImages.length === 0 ? (
                      <div className="text-sm text-gray-400 border-t border-gray-100 pt-3">
                        시나리오가 없습니다. {canEdit && "수정 버튼을 눌러 시나리오를 작성해 보세요."}
                      </div>
                    ) : null}
                    {demoImages.length > 0 && (
                      <div className={`space-y-3 ${demo.scenario ? "mt-3 pt-3 border-t border-gray-100" : ""}`}>
                        {demoImages.map((img) => (
                          <div key={img.id}>
                            <img
                              src={img.data}
                              alt={img.title || "시연 이미지"}
                              className="w-full rounded-lg object-contain max-h-[500px] border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setLightbox({ src: img.data, title: img.title }); }}
                            />
                            {img.title && <p className="text-xs text-gray-500 mt-1 text-center">{img.title}</p>}
                          </div>
                        ))}
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
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="시연 주제 제목" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시연 시나리오</label>
            <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono"
              placeholder={"① 진단 증빙 자료 제출 검증 및 평가\n- 목적 : ...\n1) [Web] 증빙 업로드 후 AI 유효성 검사"} />
            <p className="text-xs text-gray-400 mt-1">[Web], [App] 태그 → 뱃지, ①②③ → 섹션 구분</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시연 이미지</label>
            <ImageEditor images={formImages} onChange={setFormImages} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">실행 방식</label>
            <ActionEditor actions={formActions} onChange={setFormActions} apps={apps} />
          </div>

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingDemo ? "수정" : "추가"}</button>
          </div>
        </form>
      </Modal>

      {/* Lightbox 전체화면 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-2xl transition-colors"
          >
            &times;
          </button>
          {lightbox.title && (
            <p className="absolute top-4 left-4 text-white/80 text-sm bg-black/40 px-3 py-1 rounded">{lightbox.title}</p>
          )}
          <img
            src={lightbox.src}
            alt={lightbox.title || "시연 이미지"}
            className="max-w-[95vw] max-h-[95vh] object-contain cursor-pointer"
            onClick={() => setLightbox(null)}
          />
        </div>
      )}
    </div>
  );
}
