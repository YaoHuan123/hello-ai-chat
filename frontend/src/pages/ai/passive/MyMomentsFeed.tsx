import { useState } from "react";
import {
  getPassiveCloneItems,
  removePassiveCloneItem,
  updatePassiveCloneItem,
} from "../../../services/passiveCloneLocalStorage";
import type { PassiveCloneItem } from "../../../types/passiveClone";

type Props = {
  refreshKey: number;
  onChanged: () => void;
};

type ItemEditor = null | { mode: "edit"; item: PassiveCloneItem };

function ItemEditorModal({
  item,
  onClose,
  onSave,
}: {
  item: PassiveCloneItem;
  onClose: () => void;
  onSave: (title: string, body: string) => void;
}) {
  const isQa = item.type === "qa";
  const [title] = useState(item.title);
  const [body, setBody] = useState(item.body);

  return (
    <div
      className="aichat-moldt-info-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4 className="aichat-moldt-info-form__h">{isQa ? "编辑问答" : "编辑动态"}</h4>
        {isQa && (
          <>
            <label className="aichat-moldt-info-form__lab" htmlFor="pcf-title">
              问题
            </label>
            <input id="pcf-title" className="aichat-input" value={title} readOnly />
          </>
        )}
        <label className="aichat-moldt-info-form__lab" htmlFor="pcf-body">
          {isQa ? "回答" : "内容"}
        </label>
        <textarea id="pcf-body" className="aichat-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
        <div className="aichat-moldt-info-form__act">
          <button type="button" className="aichat-btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={() => onSave(title.trim(), body.trim())}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPublishedAt(ts: number): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffHours < 1) return "刚刚";
  if (diffHours < 24) return `${diffHours}小时前`;

  const d = new Date(ts);
  const nowDate = new Date(now);
  const yesterday = new Date(nowDate);
  yesterday.setDate(nowDate.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(d, yesterday)) return "昨天";
  if (d.getFullYear() === nowDate.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function MyMomentsFeed({ refreshKey, onChanged }: Props) {
  void refreshKey;
  const items = getPassiveCloneItems();
  const [editor, setEditor] = useState<ItemEditor>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

  function handleSave(title: string, body: string) {
    if (!body || editor?.mode !== "edit") {
      window.alert("请填写内容。");
      return;
    }
    const patch =
      editor.item.type === "qa"
        ? { title: title || editor.item.title, body, ts: Date.now() }
        : { title: "", body, ts: Date.now() };
    updatePassiveCloneItem(editor.item.id, patch);
    setEditor(null);
    onChanged();
  }

  function onDelete(id: string) {
    if (!window.confirm("确定删除？")) return;
    removePassiveCloneItem(id);
    onChanged();
  }

  if (items.length === 0) {
    return (
      <div className="moments-my-empty">
        <p>还没有动态。点右上角「添加」写一条。</p>
      </div>
    );
  }

  return (
    <>
      <ul className="moments-my-feed" aria-label="我的动态">
        {items.map((it) => (
          <li key={it.id} className="moments-my-feed-item">
            <time className="moments-my-feed-time" dateTime={new Date(it.ts).toISOString()}>
              {formatPublishedAt(it.ts)}
            </time>
            <article className="moments-my-card">
              <div className="moments-my-card__top">
                <div className="moments-feed-more-wrap">
                  <button
                    type="button"
                    className="moments-my-more"
                    aria-label="更多"
                    aria-expanded={menuItemId === it.id}
                    aria-haspopup="menu"
                    onClick={() => setMenuItemId((id) => (id === it.id ? null : it.id))}
                  >
                    ⋯
                  </button>
                  {menuItemId === it.id && (
                    <>
                      <div className="moments-feed-menu-backdrop" role="presentation" onClick={() => setMenuItemId(null)} />
                      <div className="moments-feed-menu" role="menu">
                        <button
                          type="button"
                          className="moments-feed-menu__item"
                          role="menuitem"
                          onClick={() => {
                            setMenuItemId(null);
                            setEditor({ mode: "edit", item: it });
                          }}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="moments-feed-menu__item moments-feed-menu__item--danger"
                          role="menuitem"
                          onClick={() => {
                            setMenuItemId(null);
                            onDelete(it.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {(() => {
                const text = it.type === "qa" ? it.title.trim() || it.body : it.body;
                if (!text) return null;
                return <p className="moments-my-card__body">{text}</p>;
              })()}
            </article>
          </li>
        ))}
      </ul>
      {editor && <ItemEditorModal item={editor.item} onClose={() => setEditor(null)} onSave={handleSave} />}
    </>
  );
}
