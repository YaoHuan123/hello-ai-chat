import { useEffect, useState } from "react";
import { getMyMolDetailForEdit, updateMyMol } from "../../services/stageApi";
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
};

type DataTab = "dialogue" | "rule";

type EditorState =
  | null
  | { mode: "add"; kind: AssistMolDataKind }
  | { mode: "edit"; item: AssistMolDataItem };

function nextId(): string {
  return `amd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function DataEditorModal({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: NonNullable<EditorState>;
  onClose: () => void;
  onSave: (kind: AssistMolDataKind, title: string, body: string) => void;
  onDelete?: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initialKind = isEdit ? state.item.type : state.kind;
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
          {isEdit && onDelete ? (
            <button type="button" className="aichat-btn-ghost" style={{ color: "var(--aichat-danger)", marginRight: "auto" }} onClick={onDelete}>
              删除
            </button>
          ) : null}
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

function RenameMolModal({
  initialName,
  busy,
  err,
  onClose,
  onSave,
}: {
  initialName: string;
  busy: boolean;
  err: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div
      className="aichat-moldt-info-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4 className="aichat-moldt-info-form__h">修改名称</h4>
        <label className="aichat-moldt-info-form__lab" htmlFor="assist-mol-rename">
          Mol 名称
        </label>
        <input
          id="assist-mol-rename"
          className="aichat-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && !busy) onSave(name);
          }}
        />
        {err && <p className="aichat-form-msg err">{err}</p>}
        <div className="aichat-moldt-info-form__act">
          <button type="button" className="aichat-btn-ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="aichat-btn-primary aichat-btn-fit" disabled={busy || !name.trim()} onClick={() => onSave(name)}>
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssistMolDataPage({ molId, onBack }: Props) {
  const [molName, setMolName] = useState("");
  const [canRename, setCanRename] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [tab, setTab] = useState<DataTab>("dialogue");
  const [editor, setEditor] = useState<EditorState>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameErr, setRenameErr] = useState("");
  const [itemEpoch, setItemEpoch] = useState(0);
  void itemEpoch;

  const items = getAssistMolItems(molId);
  const dialogueItems = items.filter((x) => x.type === "dialogue");
  const ruleItems = items.filter((x) => x.type === "rule");
  const visibleItems = tab === "dialogue" ? dialogueItems : ruleItems;

  useEffect(() => {
    let cancelled = false;
    getMyMolDetailForEdit(molId)
      .then(({ item }) => {
        if (!cancelled) {
          setMolName(item.name);
          setCanRename(item.uploaderIsMe !== false && item.source === "created");
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

  function openRename() {
    setRenameErr("");
    setRenameOpen(true);
  }

  function closeRename() {
    if (renameBusy) return;
    setRenameOpen(false);
    setRenameErr("");
  }

  async function saveRename(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setRenameErr("请输入 Mol 名称。");
      return;
    }
    if (trimmed === molName) {
      closeRename();
      return;
    }
    setRenameBusy(true);
    setRenameErr("");
    try {
      await updateMyMol(molId, { name: trimmed });
      setMolName(trimmed);
      setRenameOpen(false);
    } catch (e: unknown) {
      setRenameErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRenameBusy(false);
    }
  }

  function onSave(kind: AssistMolDataKind, title: string, body: string) {
    if (!title || !body) {
      window.alert("请填写标题与正文。");
      return;
    }
    if (editor?.mode === "add") {
      addAssistMolItem(molId, { id: nextId(), type: kind, title, body, ts: Date.now() });
      setTab(kind);
    } else if (editor?.mode === "edit") {
      updateAssistMolItem(molId, editor.item.id, { type: kind, title, body, ts: Date.now() });
      setTab(kind);
    }
    bumpItems();
    setEditor(null);
  }

  function onDeleteItem(id: string) {
    if (!window.confirm("确定删除该条数据？")) return;
    removeAssistMolItem(molId, id);
    bumpItems();
    setEditor(null);
  }

  return (
    <div className="aichat-shell assist-mol-a-shell">
      <header className="aichat-topbar aichat-topbar-flex assist-mol-a-topbar">
        <button className="assist-mol-a-topbar__link" type="button" onClick={onBack}>
          返回
        </button>
        <div className="assist-mol-a-topbar__mid">
          <h1>{molName || "Mol 数据"}</h1>
          <p>对话样例与约束</p>
        </div>
        {canRename ? (
          <button className="assist-mol-a-topbar__link" type="button" onClick={openRename}>
            重命名
          </button>
        ) : (
          <span className="aichat-topbar-spacer" aria-hidden />
        )}
      </header>

      <div className="assist-mol-a-scroll">
        {loadErr && <p className="aichat-form-msg err">{loadErr}</p>}

        <div className="assist-mol-a-tabs" role="tablist" aria-label="数据类型">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "dialogue"}
            className={`assist-mol-a-tab${tab === "dialogue" ? " assist-mol-a-tab--on" : ""}`}
            onClick={() => setTab("dialogue")}
          >
            对话样例 · {dialogueItems.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "rule"}
            className={`assist-mol-a-tab${tab === "rule" ? " assist-mol-a-tab--on" : ""}`}
            onClick={() => setTab("rule")}
          >
            约束 · {ruleItems.length}
          </button>
        </div>

        {visibleItems.length === 0 ? (
          <div className="assist-mol-a-empty assist-mol-a-empty--compact">
            <p className="assist-mol-a-empty__d">暂无{tab === "dialogue" ? "对话样例" : "约束"}，点击下方添加。</p>
          </div>
        ) : (
          <div className="assist-mol-a-data-list" aria-label={tab === "dialogue" ? "对话样例列表" : "约束列表"}>
            {visibleItems.map((it) => (
              <button key={it.id} type="button" className="assist-mol-a-data-card" onClick={() => setEditor({ mode: "edit", item: it })}>
                <span className={`assist-mol-a-data-card__tag${it.type === "rule" ? " assist-mol-a-data-card__tag--r" : ""}`}>
                  {it.type === "dialogue" ? "对话样例" : "约束"}
                </span>
                <h3 className="assist-mol-a-data-card__title">{it.title}</h3>
                <p className="assist-mol-a-data-card__body">{it.body}</p>
              </button>
            ))}
          </div>
        )}

        <div className="assist-mol-a-add">
          <button type="button" className="assist-mol-a-add__btn" onClick={() => setEditor({ mode: "add", kind: tab })}>
            + 添加{tab === "dialogue" ? "对话样例" : "约束"}
          </button>
        </div>
      </div>

      {editor && (
        <DataEditorModal
          key={editor.mode === "edit" ? editor.item.id : `add-${editor.kind}`}
          state={editor}
          onClose={() => setEditor(null)}
          onSave={onSave}
          onDelete={editor.mode === "edit" ? () => onDeleteItem(editor.item.id) : undefined}
        />
      )}

      {renameOpen && (
        <RenameMolModal initialName={molName} busy={renameBusy} err={renameErr} onClose={closeRename} onSave={saveRename} />
      )}
    </div>
  );
}
