import { useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { createGuardianGroupApi, listGuardianRolesApi } from "../../services/guardianApi";
import type { ContactItem } from "../../types/contact";
import type { GuardianRole } from "../../types/guardian";
import { contactDisplayName } from "../../lib/contactDisplay";
import { ContactAvatar } from "../../components/ContactAvatar";
import {
  guardianSceneForFeature,
  type GuardianCreateFeature,
} from "../../constants/guardianCreateFeatures";

type Props = {
  feature: GuardianCreateFeature | null;
  onBack: () => void;
  onCreated: (groupId: string) => void;
};

const MAX_PICK = 3;
const MAX_INVITE = 19;

export function CreateGuardianGroupPage({ feature, onBack, onCreated }: Props) {
  const featureScene = feature ? guardianSceneForFeature(feature) : null;
  const [groupName, setGroupName] = useState("");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [roles, setRoles] = useState<GuardianRole[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const [{ items: cs }, { items: rs }] = await Promise.all([
          listContactsApi(),
          listGuardianRolesApi(featureScene ?? undefined),
        ]);
        if (!cancelled) {
          setContacts(cs);
          setRoles(rs);
          setPicked((prev) => prev.filter((id) => rs.some((r) => r.id === id)));
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featureScene]);

  const visibleRoles = useMemo(() => roles, [roles]);

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_INVITE) return prev;
      return [...prev, id];
    });
  }

  function toggleRole(id: string) {
    const role = roles.find((r) => r.id === id);
    if (!role) return;
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICK) return prev;
      if (prev.length > 0) {
        const anchor = roles.find((r) => r.id === prev[0]);
        if (anchor && role.scene !== anchor.scene) {
          setErr("搭子类型不一致");
          return prev;
        }
      }
      setErr("");
      return [...prev, id];
    });
  }

  async function onSubmit() {
    if (selectedIds.length < 1) {
      setErr("请至少选择 1 位成员");
      return;
    }
    if (picked.length < 1) {
      setErr("请至少选择 1 位搭子");
      return;
    }
    const pickedRoles = picked
      .map((id) => roles.find((r) => r.id === id))
      .filter((r): r is GuardianRole => Boolean(r));
    const scene = pickedRoles[0]?.scene;
    if (!scene || pickedRoles.some((r) => r.scene !== scene)) {
      setErr("搭子选择无效");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const name = groupName.trim();
      const { group } = await createGuardianGroupApi({
        name: name || undefined,
        memberUserIds: selectedIds,
        scene,
        guardianRoleIds: picked,
      });
      onCreated(group.id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && !loading && selectedIds.length >= 1 && picked.length >= 1;

  return (
    <div className="aichat-shell guardian-create guardian-create--wechat">
      <header className="aichat-topbar aichat-topbar-flex guardian-create__topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack} disabled={submitting}>
          取消
        </button>
        <h1 className="guardian-create__title">发起群聊</h1>
        <button
          type="button"
          className="guardian-create__done"
          disabled={!canSubmit}
          onClick={() => void onSubmit()}
        >
          {submitting ? "创建中…" : "完成"}
        </button>
      </header>

      <div className="aichat-main guardian-create-main">
        <div className="guardian-create-name-row">
          <label className="guardian-create-name-label" htmlFor="guardian-group-name">
            群聊名称
          </label>
          <input
            id="guardian-group-name"
            className="aichat-input guardian-create-name-input"
            placeholder="未命名群聊"
            maxLength={32}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <section className="guardian-create-section" aria-labelledby="guardian-create-members">
          <div className="guardian-create-section__head">
            <h2 id="guardian-create-members" className="guardian-create-section__title">
              邀请成员
            </h2>
            {selectedIds.length > 0 ? (
              <span className="guardian-create-section__meta">已选 {selectedIds.length} 人</span>
            ) : null}
          </div>
          {loading ? (
            <p className="aichat-muted-line guardian-create-section__empty">加载中…</p>
          ) : contacts.length === 0 ? (
            <p className="aichat-muted-line guardian-create-section__empty">暂无联系人，请先添加好友</p>
          ) : (
            <ul className="guardian-contact-list">
              {contacts.map((c) => {
                const on = selectedIds.includes(c.contactUserId);
                return (
                  <li key={c.contactUserId}>
                    <button
                      type="button"
                      className={`guardian-contact-row${on ? " guardian-contact-row--on" : ""}`}
                      disabled={submitting}
                      onClick={() => toggleContact(c.contactUserId)}
                    >
                      <span className={`guardian-contact-check${on ? " guardian-contact-check--on" : ""}`} aria-hidden>
                        {on ? "✓" : ""}
                      </span>
                      <ContactAvatar contact={c} className="guardian-contact-avatar" alt="" />
                      <span className="guardian-contact-name">{contactDisplayName(c)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="guardian-create-section" aria-labelledby="guardian-create-guardians">
          <div className="guardian-create-section__head">
            <h2 id="guardian-create-guardians" className="guardian-create-section__title">
              选择搭子
            </h2>
            <span className="guardian-create-section__meta">
              已选 {picked.length}/{MAX_PICK}
            </span>
          </div>
          {loading ? (
            <p className="aichat-muted-line guardian-create-section__empty">加载中…</p>
          ) : visibleRoles.length === 0 ? (
            <p className="aichat-muted-line guardian-create-section__empty">暂无搭子</p>
          ) : (
            <ul className="guardian-create-role-list">
              {visibleRoles.map((r) => {
                const on = picked.includes(r.id);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`guardian-create-role-row${on ? " guardian-create-role-row--on" : ""}`}
                      disabled={submitting}
                      onClick={() => toggleRole(r.id)}
                    >
                      <span className={`guardian-contact-check${on ? " guardian-contact-check--on" : ""}`} aria-hidden>
                        {on ? "✓" : ""}
                      </span>
                      <GuardianAvatar role={r} className="guardian-create-role-row__av" alt="" />
                      <span className="guardian-create-role-row__body">
                        <strong className="guardian-create-role-row__name">{r.name}</strong>
                        {r.userMessage.trim() ? (
                          <span className="guardian-create-role-row__msg">{r.userMessage}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {err ? <p className="aichat-form-msg err">{err}</p> : null}
      </div>
    </div>
  );
}
