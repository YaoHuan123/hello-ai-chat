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
        <h4 className="aichat-moldt-info-form__h">{isQa ? "编辑问答" : "编辑朋友圈"}</h4>
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "今天";
  if (isSameDay(d, yesterday)) return "昨天";
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatRowTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type DayGroup = {
  dayKey: string;
  dayLabel: string;
  dayIso: string;
  items: PassiveCloneItem[];
};

function groupItemsByDay(items: PassiveCloneItem[]): DayGroup[] {
  const sorted = [...items].sort((a, b) => b.ts - a.ts);
  const groups: DayGroup[] = [];
  for (const item of sorted) {
    const key = dayKey(item.ts);
    const last = groups[groups.length - 1];
    const d = new Date(item.ts);
    const dayIso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    if (last?.dayKey === key) {
      last.items.push(item);
    } else {
      groups.push({ dayKey: key, dayLabel: formatDayLabel(item.ts), dayIso, items: [item] });
    }
  }
  return groups;
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
        <p>还没有朋友圈内容。点右上角「添加」写一条。</p>
      </div>
    );
  }

  const dayGroups = groupItemsByDay(items);

  return (
    <>
      <div className="moments-my-day-groups" aria-label="我的朋友圈">
        {dayGroups.map((group) => (
          <section key={group.dayKey} className="moments-my-day-group">
            <h2 className="moments-my-day-group__title">
              <time dateTime={group.dayIso}>{group.dayLabel}</time>
            </h2>
            <ul className="moments-my-day-rows">
              {group.items.map((it) => {
                const isQa = it.type === "qa";
                const question = isQa ? it.title.trim() : "";
                const body = it.body.trim();
                if (!question && !body) return null;

                return (
                  <li key={it.id} className="moments-my-day-row">
                    <time className="moments-my-day-row__time" dateTime={new Date(it.ts).toISOString()}>
                      {formatRowTime(it.ts)}
                    </time>
                    <div className="moments-my-day-row__main">
                      {question ? <p className="moments-my-day-row__q">{question}</p> : null}
                      {body ? <p className="moments-my-day-row__body">{body}</p> : null}
                    </div>
                    <div className="moments-feed-more-wrap moments-my-day-row__more">
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
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {editor && <ItemEditorModal item={editor.item} onClose={() => setEditor(null)} onSave={handleSave} />}
    </>
  );
}
