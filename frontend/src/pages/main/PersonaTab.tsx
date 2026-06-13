import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { createFriendRequestApi } from "../../services/friendRequestsApi";
import { wsClient } from "../../services/wsClient";
import { AppIcon } from "../../components/AppIcons";
import { ContactAvatar } from "../../components/ContactAvatar";
import { ContactRelationSheet } from "../../components/ContactRelationSheet";
import { contactDisplayName as displayContactName } from "../../lib/contactDisplay";
import { filterContacts, groupContactsByRelation } from "../../lib/contactRelations";
import type { ContactItem } from "../../types/contact";

type Props = {
  onOpenChat: (c: ContactItem) => void;
  onOpenFriendRequests: () => void;
  friendRequestPendingCount: number;
  onFriendRequestSent: () => void;
  onOpenGuardianHall: () => void;
};

export function PersonaTab({
  onOpenChat,
  onOpenFriendRequests,
  friendRequestPendingCount,
  onFriendRequestSent,
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
  const [editContact, setEditContact] = useState<ContactItem | null>(null);

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
  const showGuardianSection = !q || q.includes("搭") || q.includes("搭子") || q.includes("ai");

  const filteredContacts = useMemo(() => filterContacts(contacts, query, "all"), [contacts, query]);
  const contactGroups = useMemo(() => groupContactsByRelation(filteredContacts), [filteredContacts]);

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

  function onContactRowClick(c: ContactItem) {
    if (!c.relationType) {
      setEditContact(c);
      return;
    }
    onOpenChat(c);
  }

  function onContactSaved(next: ContactItem) {
    setContacts((prev) => prev.map((x) => (x.contactUserId === next.contactUserId ? next : x)));
    setEditContact(null);
  }

  const pending = friendRequestPendingCount > 0 ? friendRequestPendingCount : 0;
  const hasListContent = filteredContacts.length > 0;
  const showContactsBlock = !loading && (hasListContent || showGuardianSection);
  const contactCount = filteredContacts.length + (showGuardianSection ? 1 : 0);
  const showEmpty = !loading && !showGuardianSection && !hasListContent;

  return (
    <div className="aichat-main-shell-tab persona-tab">
      <header className="aichat-topbar persona-tab__topbar aichat-topbar--plain">
        <h1>关系</h1>
      </header>

      <div className="persona-tab__search-wrap">
        <input
          className="persona-tab__search"
          type="search"
          placeholder="搜联系人、关系"
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
        </div>

        {loading ? null : showEmpty ? (
          <div className="persona-tab__empty">
            <p>没有匹配的联系人</p>
            {q ? (
              <button
                type="button"
                className="aichat-btn-ghost"
                onClick={() => setQuery("")}
              >
                清除搜索
              </button>
            ) : null}
          </div>
        ) : showContactsBlock ? (
          <>
            <div className="persona-tab__section-head persona-tab__section-head--global">
              <h2>联系人</h2>
              <span>{contactCount}</span>
              <button type="button" className="persona-tab__section-act" onClick={() => setSheetOpen(true)}>
                添加
              </button>
            </div>
            {showGuardianSection ? (
              <section className="persona-tab__section persona-tab__section--guardian" aria-label="搭子">
                <div className="persona-tab__section-head">
                  <h2>搭子</h2>
                </div>
                <button type="button" className="persona-tab__row persona-tab__row--guardian" onClick={onOpenGuardianHall}>
                  <span className="persona-tab__av persona-tab__av--ai" aria-hidden>
                    <AppIcon name="aiContact" className="app-icon app-icon--guardian" />
                  </span>
                  <span className="persona-tab__mid">
                    <strong>搭子大厅</strong>
                    <span className="persona-tab__mid-hint">群聊场景角色</span>
                  </span>
                  <span className="persona-tab__row-arrow" aria-hidden>
                    ›
                  </span>
                </button>
              </section>
            ) : null}
            {contactGroups.map((group) => (
              <section key={group.label} className="persona-tab__section" aria-label={group.label}>
                <div className="persona-tab__section-head">
                  <h2>{group.label}</h2>
                  <span>{group.contacts.length}</span>
                </div>
                {group.contacts.map((c) => (
                  <button
                    key={c.contactUserId}
                    type="button"
                    className="persona-tab__row"
                    onClick={() => onContactRowClick(c)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setEditContact(c);
                    }}
                  >
                    <ContactAvatar contact={c} className="persona-tab__av persona-tab__av--human" alt="" />
                    <span className="persona-tab__mid">
                      <strong>{displayContactName(c)}</strong>
                      {!c.relationType ? <span className="persona-tab__mid-hint">点击设置关系</span> : null}
                    </span>
                    <span className="persona-tab__row-arrow" aria-hidden>
                      ›
                    </span>
                  </button>
                ))}
              </section>
            ))}
          </>
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

      {editContact ? (
        <ContactRelationSheet
          contact={editContact}
          open
          onClose={() => setEditContact(null)}
          onSaved={onContactSaved}
        />
      ) : null}
    </div>
  );
}
