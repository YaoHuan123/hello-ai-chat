import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { createFriendRequestApi } from "../../services/friendRequestsApi";
import { wsClient } from "../../services/wsClient";
import { AppIcon } from "../../components/AppIcons";
import { ContactAvatar } from "../../components/ContactAvatar";
import { contactDisplayName as displayContactName } from "../../lib/contactDisplay";
import type { ContactItem } from "../../types/contact";

type Props = {
  onOpenChat: (c: ContactItem) => void;
  onOpenFriendRequests: () => void;
  friendRequestPendingCount: number;
  onFriendRequestSent: () => void;
  onOpenMolList: () => void;
  onOpenGuardianHall: () => void;
};

export function PersonaTab({
  onOpenChat,
  onOpenFriendRequests,
  friendRequestPendingCount,
  onFriendRequestSent,
  onOpenMolList,
  onOpenGuardianHall,
}: Props) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [addErr, setAddErr] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(() => {
    return listContactsApi()
      .then((cRes) => {
        setContacts(cRes.items);
        setErr("");
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const unsub = wsClient.subscribe((msg) => {
      if (msg.type === "friend_request_accepted") void refresh();
    });
    return unsub;
  }, [refresh]);

  const q = query.trim().toLowerCase();

  const filteredContacts = useMemo(() => {
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = displayContactName(c).toLowerCase();
      const phone = c.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, q]);

  const showMolEntry = !q || "mol".includes(q) || q.includes("mol") || q.includes("我的");
  const showAiEntry = !q || q.includes("搭") || q.includes("搭子") || q.includes("ai");

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
      onFriendRequestSent();
    } catch (err) {
      setAddErr(err instanceof Error ? err.message : "发送失败");
    } finally {
      setAdding(false);
    }
  }

  const pending = friendRequestPendingCount > 0 ? friendRequestPendingCount : 0;
  const showContactsSection = !q || filteredContacts.length > 0;
  const showEmpty =
    !loading && !showMolEntry && !showAiEntry && (!showContactsSection || filteredContacts.length === 0);

  return (
    <div className="aichat-main-shell-tab persona-tab">
      <header className="aichat-topbar persona-tab__topbar aichat-topbar--plain">
        <h1>人物</h1>
      </header>

      <div className="persona-tab__search-wrap">
        <input
          className="persona-tab__search"
          type="search"
          placeholder="搜联系人"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="aichat-main persona-tab__main">
        {err && <p className="aichat-form-msg err">{err}</p>}

        <div className="persona-tab__entries">
          <button type="button" className="contacts-entry-card persona-tab__requests" onClick={onOpenFriendRequests}>
            <span className="contacts-entry-card__icon" aria-hidden>
              <AppIcon name="mail" className="app-icon app-icon--warm" />
            </span>
            <span className="contacts-entry-card__body">
              <span className="contacts-entry-card__title">好友请求</span>
            </span>
            {pending > 0 ? <span className="contacts-entry-card__badge">{pending > 99 ? "99+" : pending}</span> : null}
            <span className="contacts-entry-card__arrow" aria-hidden>
              ›
            </span>
          </button>

          {showMolEntry ? (
            <button type="button" className="contacts-entry-card persona-tab__entry persona-tab__entry--mol" onClick={onOpenMolList}>
              <span className="contacts-entry-card__icon" aria-hidden>
                <AppIcon name="mol" className="app-icon app-icon--mol" />
              </span>
              <span className="contacts-entry-card__body">
                <span className="contacts-entry-card__title">我的 Mol</span>
              </span>
              <span className="contacts-entry-card__arrow" aria-hidden>
                ›
              </span>
            </button>
          ) : null}

          {showAiEntry ? (
            <button type="button" className="contacts-entry-card persona-tab__entry persona-tab__entry--ai" onClick={onOpenGuardianHall}>
              <span className="contacts-entry-card__icon" aria-hidden>
                <AppIcon name="aiContact" className="app-icon app-icon--guardian" />
              </span>
              <span className="contacts-entry-card__body">
                <span className="contacts-entry-card__title">搭子</span>
              </span>
              <span className="contacts-entry-card__arrow" aria-hidden>
                ›
              </span>
            </button>
          ) : null}
        </div>

        {loading ? null : showEmpty ? (
          <div className="persona-tab__empty">
            <p>没有匹配的联系人</p>
            {q ? (
              <button type="button" className="aichat-btn-ghost" onClick={() => setQuery("")}>
                清除搜索
              </button>
            ) : null}
          </div>
        ) : showContactsSection ? (
          <section className="persona-tab__section" aria-label="联系人">
            <div className="persona-tab__section-head">
              <h2>联系人</h2>
              <span>{contacts.length}</span>
              <button type="button" className="persona-tab__section-act" onClick={() => setSheetOpen(true)}>
                添加
              </button>
            </div>
            {filteredContacts.length === 0 ? (
              <p className="persona-tab__section-empty">暂无联系人</p>
            ) : (
              filteredContacts.map((c) => (
                <button key={c.contactUserId} type="button" className="persona-tab__row" onClick={() => onOpenChat(c)}>
                  <ContactAvatar contact={c} className="persona-tab__av persona-tab__av--human" alt="" />
                  <span className="persona-tab__mid">
                    <strong>{displayContactName(c)}</strong>
                  </span>
                </button>
              ))
            )}
          </section>
        ) : null}
      </div>

      {sheetOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={() => !adding && setSheetOpen(false)}>
          <div className="contacts-sheet" role="dialog" aria-modal="true" aria-labelledby="persona-add-title" onClick={(ev) => ev.stopPropagation()}>
            <div className="contacts-sheet__handle" aria-hidden />
            <h2 id="persona-add-title" className="contacts-sheet__title">
              添加好友
            </h2>
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
                placeholder="验证消息"
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
