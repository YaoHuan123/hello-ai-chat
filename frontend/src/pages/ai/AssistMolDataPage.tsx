import { useEffect, useState } from "react";
import { getMyMolDetailForEdit } from "../../services/stageApi";
import {
  addAssistMolItem,
  getAssistMolItems,
  removeAssistMolItem,
  updateAssistMolItem,
} from "../../services/molDataLocalStorage";
import type { AssistMolDataItem, AssistMolDataKind } from "../../types/molData";

type Props = {
  molId: string;
  onBack: () => void;
  onOpenInfo: () => void;
};

function nextId(): string {
  return `amd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type EditorState =
  | null
  | { mode: "add" }
  | { mode: "edit"; item: AssistMolDataItem };

function DataEditorModal({
  state,
  onClose,
  onSave,
}: {
  state: NonNullable<EditorState>;
  onClose: () => void;
  onSave: (kind: AssistMolDataKind, title: string, body: string) => void;
}) {
  const isEdit = state.mode === "edit";
  const initialKind = isEdit ? state.item.type : "dialogue";
  const [kind, setKind] = useState<AssistMolDataKind>(initialKind);
  const [title, setTitle] = useState(isEdit ? state.item.title : "");
  const [body, setBody] = useState(isEdit ? state.item.body : "");

  return (
    <div
      className="aichat-moldt-info-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4 className="aichat-moldt-info-form__h">{isEdit ? "编辑数据" : "添加数据"}</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={kind === "dialogue" ? "aichat-btn-primary aichat-btn-fit" : "aichat-btn-ghost"}
            onClick={() => setKind("dialogue")}
          >
            对话样例
          </button>
          <button
            type="button"
            className={kind === "rule" ? "aichat-btn-primary aichat-btn-fit" : "aichat-btn-ghost"}
            onClick={() => setKind("rule")}
          >
            约束
          </button>
        </div>
        <label className="aichat-moldt-info-form__lab" htmlFor="amd-title">
          标题
        </label>
        <input id="amd-title" className="aichat-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <label className="aichat-moldt-info-form__lab" htmlFor="amd-body">
          {kind === "dialogue" ? "对话内容" : "约束说明"}
        </label>
        <textarea id="amd-body" className="aichat-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} />
        <div className="aichat-moldt-info-form__act">
          <button type="button" className="aichat-btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={() => onSave(kind, title.trim(), body.trim())}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssistMolDataPage({ molId, onBack, onOpenInfo }: Props) {
  const [molName, setMolName] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [itemEpoch, setItemEpoch] = useState(0);
  void itemEpoch;
  const items = getAssistMolItems(molId);

  useEffect(() => {
    let cancelled = false;
    getMyMolDetailForEdit(molId)
      .then(({ item }) => {
        if (!cancelled) {
          setMolName(item.name);
          setLoadErr("");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [molId]);

  function bumpItems() {
    setItemEpoch((n) => n + 1);
  }

  function onSave(kind: AssistMolDataKind, title: string, body: string) {
    if (!title || !body) {
      window.alert("请填写标题与正文。");
      return;
    }
    if (editor?.mode === "add") {
      addAssistMolItem(molId, { id: nextId(), type: kind, title, body, ts: Date.now() });
    } else if (editor?.mode === "edit") {
      updateAssistMolItem(molId, editor.item.id, { type: kind, title, body, ts: Date.now() });
    }
    bumpItems();
    setEditor(null);
  }

  function onDelete(id: string) {
    if (!window.confirm("确定删除该条数据？")) return;
    removeAssistMolItem(molId, id);
    bumpItems();
  }

  const typeLabel = (t: AssistMolDataKind) => (t === "dialogue" ? "对话样例" : "约束");

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{molName || "MOL 数据"}</h1>
          <p style={{ marginTop: 2 }}>对话样例与约束</p>
        </div>
        <button className="aichat-btn-ghost" type="button" onClick={onOpenInfo}>
          信息
        </button>
      </header>

      <div className="aichat-main aichat-page-main">
        {loadErr && <p className="aichat-form-msg err">{loadErr}</p>}
        <div className="aichat-mymols-toolbar">
          <button type="button" className="aichat-btn-primary" onClick={() => setEditor({ mode: "add" })}>
            添加数据
          </button>
        </div>

        {items.length === 0 ? (
          <div className="aichat-card aichat-page-card">
            <p style={{ margin: 0, color: "var(--aichat-muted)" }}>暂无数据，可添加对话样例或约束。</p>
          </div>
        ) : (
          <ul className="aichat-list" aria-label="数据列表">
            {items.map((it) => (
              <li key={it.id}>
                <div className="aichat-card aichat-page-card">
                  <div className="aichat-inline-row aichat-inline-row-between">
                    <span className="aichat-tag-s">{typeLabel(it.type)}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="aichat-btn-ghost" onClick={() => setEditor({ mode: "edit", item: it })}>
                        编辑
                      </button>
                      <button type="button" className="aichat-btn-ghost" style={{ color: "var(--aichat-danger)" }} onClick={() => onDelete(it.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                  <h2 className="aichat-panel-title" style={{ marginTop: 8 }}>
                    {it.title}
                  </h2>
                  <p className="aichat-card-hint" style={{ whiteSpace: "pre-wrap" }}>
                    {it.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editor && <DataEditorModal key={editor.mode === "edit" ? editor.item.id : "add"} state={editor} onClose={() => setEditor(null)} onSave={onSave} />}
    </div>
  );
}
