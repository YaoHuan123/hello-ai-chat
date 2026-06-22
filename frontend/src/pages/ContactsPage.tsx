import { type FormEvent, useEffect, useState } from "react";
import { listContactsApi, removeContactApi } from "../services/api";
import { createFriendRequestApi } from "../services/friendRequestsApi";
import { wsClient } from "../services/wsClient";
import { AppIcon } from "../components/AppIcons";
import { ContactAvatar } from "../components/ContactAvatar";
import { contactDisplayName, contactMetaLine, maskPhoneDisplay } from "../lib/contactDisplay";
import type { ContactItem } from "../types/contact";

type Props = {
  onBack: () => void;
  /** 嵌入主导航 Tab 时：无外层壳、无返回按钮 */
  embedded?: boolean;
  onOpenFriendRequests?: () => void;
  friendRequestPendingCount?: number;
  onFriendRequestSent?: () => void;
  onOpenChat?: (c: ContactItem) => void;
};

function subtitleLine(c: ContactItem): string {
  const r = c.remark?.trim();
  if (r) return maskPhoneDisplay(c.phone);
  return contactMetaLine(c);
}

export function ContactsPage({
  onBack,
  embedded = false,
  onOpenFriendRequests,
  friendRequestPendingCount = 0,
  onFriendRequestSent,
  onOpenChat,
}: Props) {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [addErr, setAddErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items: next } = await listContactsApi();
        if (!cancelled) setItems(next);
      } catch (e) {
        if (!cancelled) setListErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = wsClient.subscribe((msg) => {
      if (msg.type !== "friend_request_accepted") return;
      void (async () => {
        try {
          const { items: next } = await listContactsApi();
          setItems(next);
        } catch {
          // 静默；红点由 App 层处理
        }
      })();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    function onDocClick() {
      setMenuOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenId]);

  async function onAddSubmit(e: FormEvent) {
    e.preventDefault();
    const phone = addPhone.trim();
    if (!phone) {
      setAddErr("请输入手机号");
      return;
    }
    setAdding(true);
    setAddErr("");
    try {
      const message = addMessage.trim() === "" ? undefined : addMessage.trim();
      await createFriendRequestApi(phone, message);
      setAddPhone("");
      setAddMessage("");
      setSheetOpen(false);
      onFriendRequestSent?.();
    } catch (err) {
      setAddErr(err instanceof Error ? err.message : "发送失败");
    } finally {
      setAdding(false);
    }
  }

  function onDelete(c: ContactItem) {
    setMenuOpenId(null);
    if (!window.confirm("确认删除此联系人？")) return;
    void (async () => {
      try {
        await removeContactApi(c.contactUserId);
        setItems((prev) => prev.filter((x) => x.contactUserId !== c.contactUserId));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "删除失败");
      }
    })();
  }

  const shell = embedded ? "aichat-embed-shell contacts-tab-root" : "aichat-shell contacts-tab-root";
  const pending = friendRequestPendingCount > 0 ? friendRequestPendingCount : 0;

  return (
    <div className={shell}>
      <header className="aichat-topbar aichat-topbar-flex contacts-tab-topbar">
        {embedded ? (
          <span className="contacts-tab-topbar__spacer" aria-hidden />
        ) : (
          <button className="aichat-btn-ghost" type="button" onClick={onBack}>
            返回
          </button>
        )}
        <div className="aichat-stage-head">
          <h1>联系人</h1>
          <p>{items.length > 0 ? `${items.length} 位好友` : "已注册用户"}</p>
        </div>
        <button
          className="contacts-tab-add-btn"
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="发送好友申请"
        >
          添加
        </button>
      </header>

      <div className={`aichat-main contacts-tab-main${embedded ? " aichat-main--embed" : ""}`}>
        {listErr && <p className="aichat-form-msg err">{listErr}</p>}

        {onOpenFriendRequests ? (
          <button type="button" className="contacts-entry-card" onClick={onOpenFriendRequests}>
            <span className="contacts-entry-card__icon" aria-hidden>
              <AppIcon name="mail" className="app-icon app-icon--warm" />
            </span>
            <span className="contacts-entry-card__body">
              <span className="contacts-entry-card__title">好友请求</span>
            </span>
            {pending > 0 ? (
              <span className="contacts-entry-card__badge">{pending > 99 ? "99+" : pending}</span>
            ) : null}
            <span className="contacts-entry-card__arrow" aria-hidden>
              ›
            </span>
          </button>
        ) : null}

        {loading ? (
          <ul className="contacts-list contacts-list--skeleton" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <div className="contacts-row contacts-row--skeleton">
                  <span className="contacts-avatar contacts-skeleton-block" />
                  <span className="contacts-body">
                    <span className="contacts-skeleton-line contacts-skeleton-line--name" />
                    <span className="contacts-skeleton-line contacts-skeleton-line--sub" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="contacts-empty">
            <span className="contacts-empty__icon" aria-hidden>
              <AppIcon name="usersEmpty" className="app-icon app-icon--lg app-icon--muted" />
            </span>
            <p className="contacts-empty__title">还没有联系人</p>
            <p className="contacts-empty__hint">发送好友申请，对方同意后双方将出现在列表中</p>
            <button className="aichat-btn-primary contacts-empty__btn" type="button" onClick={() => setSheetOpen(true)}>
              发送好友申请
            </button>
          </div>
        ) : (
          <ul className="contacts-list" aria-label="联系人列表">
            {items.map((c) => (
              <li key={c.contactUserId} className="contacts-list__item">
                <div className="contacts-row">
                  <button
                    type="button"
                    className="contacts-row__main"
                    onClick={() => onOpenChat?.(c)}
                    aria-label={`与${contactDisplayName(c)}聊天`}
                  >
                    <ContactAvatar contact={c} className="contacts-avatar" alt="" />
                    <span className="contacts-body">
                      <span className="contacts-name">{contactDisplayName(c)}</span>
                      <span className="contacts-sub">{subtitleLine(c)}</span>
                    </span>
                  </button>
                  <div className="contacts-row__actions">
                    <button
                      type="button"
                      className="contacts-more-btn"
                      aria-expanded={menuOpenId === c.contactUserId}
                      aria-label="更多"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId((id) => (id === c.contactUserId ? null : c.contactUserId));
                      }}
                    >
                      ···
                    </button>
                    {menuOpenId === c.contactUserId ? (
                      <div className="contacts-menu" role="menu">
                        <button type="button" className="contacts-menu__item contacts-menu__item--danger" role="menuitem" onClick={() => onDelete(c)}>
                          删除联系人
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sheetOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !adding && setSheetOpen(false)}>
          <div
            className="contacts-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contacts-add-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="contacts-sheet__handle" aria-hidden />
            <h2 id="contacts-add-title" className="contacts-sheet__title">
              发送好友申请
            </h2>
            <p className="contacts-sheet__desc">输入对方注册手机号，附言可选</p>
            <form className="aichat-form contacts-sheet__form" onSubmit={onAddSubmit}>
              <input
                className="aichat-input"
                placeholder="手机号"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={13}
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                disabled={adding}
              />
              <textarea
                className="aichat-textarea"
                placeholder="附言（可选）"
                maxLength={200}
                rows={2}
                value={addMessage}
                onChange={(e) => setAddMessage(e.target.value)}
                disabled={adding}
              />
              {addErr ? <p className="aichat-form-msg err">{addErr}</p> : null}
              <div className="contacts-sheet__actions">
                <button className="aichat-btn-ghost contacts-sheet__btn" type="button" disabled={adding} onClick={() => setSheetOpen(false)}>
                  取消
                </button>
                <button className="aichat-btn-primary contacts-sheet__btn" type="submit" disabled={adding}>
                  {adding ? "发送中…" : "发送"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
