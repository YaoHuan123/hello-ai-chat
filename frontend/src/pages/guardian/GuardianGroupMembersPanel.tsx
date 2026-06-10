import { useMemo, useState } from "react";
import { ContactAvatar } from "../../components/ContactAvatar";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { contactDisplayName } from "../../lib/contactDisplay";
import { addGuardianGroupMembersApi, removeGuardianGroupMemberApi } from "../../services/guardianApi";
import type { ContactItem } from "../../types/contact";
import type { GuardianGroup, GuardianRole } from "../../types/guardian";

type Props = {
  groupId: string;
  group: GuardianGroup;
  roles: Map<string, GuardianRole>;
  contacts: ContactItem[];
  myUserId: string;
  isOwner: boolean;
  onBack: () => void;
  onGroupUpdated: (group: GuardianGroup) => void;
};

const MAX_HUMANS = 20;

function contactForMember(contacts: ContactItem[], userId: string, phone: string): ContactItem {
  return (
    contacts.find((c) => c.contactUserId === userId) ?? {
      contactUserId: userId,
      phone,
      remark: null,
      nickname: null,
      avatarUrl: null,
      avatarUpdatedAt: null,
      createdAt: 0,
    }
  );
}

export function GuardianGroupMembersPanel({
  groupId,
  group,
  roles,
  contacts,
  myUserId,
  isOwner,
  onBack,
  onGroupUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState("");

  const memberIds = useMemo(() => new Set(group.members.map((m) => m.userId)), [group.members]);
  const addableContacts = useMemo(
    () => contacts.filter((c) => !memberIds.has(c.contactUserId)),
    [contacts, memberIds],
  );
  const slotsLeft = MAX_HUMANS - group.members.length;

  function togglePick(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= slotsLeft) return prev;
      return [...prev, id];
    });
  }

  function onAddClick() {
    if (slotsLeft <= 0) {
      setErr("群成员已达上限");
      return;
    }
    if (addableContacts.length === 0) {
      setErr("没有可添加的联系人");
      return;
    }
    openAdd();
  }

  function openAdd() {
    setErr("");
    setPicked([]);
    setAddOpen(true);
  }

  function closeAdd() {
    if (busy) return;
    setAddOpen(false);
    setPicked([]);
    setErr("");
  }

  async function onAddSubmit() {
    if (picked.length === 0) {
      setErr("请选择联系人");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { group: next } = await addGuardianGroupMembersApi(groupId, picked);
      onGroupUpdated(next);
      setPicked([]);
      setAddOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(userId: string, name: string) {
    if (!window.confirm(`确认将 ${name} 移出群聊？`)) return;
    setBusy(true);
    setErr("");
    try {
      const { group: next } = await removeGuardianGroupMemberApi(groupId, userId);
      onGroupUpdated(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aichat-shell guardian-group-members">
      <header className="aichat-topbar aichat-topbar-flex guardian-group-members__topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <h1 className="guardian-group-members__title">群成员</h1>
        {isOwner ? (
          <button
            type="button"
            className="guardian-group-members__add-btn"
            aria-label="添加成员"
            disabled={busy}
            onClick={onAddClick}
          >
            +
          </button>
        ) : (
          <span className="guardian-group-members__topbar-spacer" aria-hidden />
        )}
      </header>

      <div className="aichat-main guardian-group-members__main">
        {err && !addOpen ? <p className="aichat-form-msg err">{err}</p> : null}
        <section className="guardian-group-members__section" aria-labelledby="guardian-members-human">
          <h2 id="guardian-members-human" className="guardian-group-members__section-title">
            成员
          </h2>
          <ul className="guardian-group-sheet__list">
            {group.members.map((m) => {
              const c = contactForMember(contacts, m.userId, m.phone);
              const isHost = m.userId === group.protectedUserId;
              const name = m.userId === myUserId ? "我" : contactDisplayName(c);
              const canRemove = isOwner && !isHost;
              return (
                <li key={m.userId} className="guardian-group-sheet__row">
                  <ContactAvatar contact={c} className="guardian-group-sheet__av" alt="" />
                  <span className="guardian-group-sheet__name">
                    {name}
                    {isHost ? "（群主）" : ""}
                  </span>
                  {canRemove ? (
                    <button
                      type="button"
                      className="guardian-group-members__remove"
                      disabled={busy}
                      onClick={() => void onRemove(m.userId, name)}
                    >
                      移除
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {group.guardianRoleIds.length > 0 ? (
          <section className="guardian-group-members__section" aria-labelledby="guardian-members-ai">
            <h2 id="guardian-members-ai" className="guardian-group-members__section-title">
              搭子
            </h2>
            <ul className="guardian-group-sheet__list">
              {group.guardianRoleIds.map((id) => {
                const r = roles.get(id);
                if (!r) return null;
                return (
                  <li key={id} className="guardian-group-sheet__row guardian-group-sheet__row--ai">
                    <GuardianAvatar role={r} className="guardian-group-sheet__av guardian-group-sheet__av--ai" alt="" />
                    <span className="guardian-group-sheet__name">{r.name}</span>
                    <span className="guardian-group-sheet__tag">搭子</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {addOpen ? (
        <div className="contacts-sheet-overlay" role="presentation" onClick={closeAdd}>
          <div
            className="contacts-sheet guardian-group-members__add-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guardian-members-pick-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="contacts-sheet__handle" aria-hidden />
            <h2 id="guardian-members-pick-title" className="contacts-sheet__title">
              选择联系人
            </h2>
            <ul className="guardian-group-sheet__pick-list">
              {addableContacts.map((c) => {
                const on = picked.includes(c.contactUserId);
                return (
                  <li key={c.contactUserId}>
                    <button
                      type="button"
                      className={`guardian-group-sheet__pick${on ? " guardian-group-sheet__pick--on" : ""}`}
                      disabled={busy}
                      onClick={() => togglePick(c.contactUserId)}
                    >
                      <span className={`guardian-contact-check${on ? " guardian-contact-check--on" : ""}`} aria-hidden>
                        {on ? "✓" : ""}
                      </span>
                      <ContactAvatar contact={c} className="guardian-group-sheet__av" alt="" />
                      <span>{contactDisplayName(c)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {err ? <p className="aichat-form-msg err">{err}</p> : null}
            <div className="contacts-sheet__actions">
              <button type="button" className="aichat-btn-ghost contacts-sheet__btn" disabled={busy} onClick={closeAdd}>
                取消
              </button>
              <button
                type="button"
                className="aichat-btn-primary contacts-sheet__btn"
                disabled={busy || picked.length === 0}
                onClick={() => void onAddSubmit()}
              >
                {busy ? "添加中…" : "添加"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
