import { useEffect, useState } from "react";
import { listContactsApi } from "../../services/api";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { createGuardianGroupApi, listGuardianRolesApi } from "../../services/guardianApi";
import type { ContactItem } from "../../types/contact";
import type { GuardianRole, GuardianScene } from "../../types/guardian";
import { contactDisplayName } from "../../lib/contactDisplay";
import { ContactAvatar } from "../../components/ContactAvatar";

type Props = {
  onBack: () => void;
  onCreated: (groupId: string) => void;
};

const SCENES: GuardianScene[] = ["恋爱暧昧", "校园师生", "家庭亲子"];
const MAX_PICK = 3;
const MAX_INVITE = 19;

export function CreateGuardianGroupPage({ onBack, onCreated }: Props) {
  const [groupName, setGroupName] = useState("");
  const [scene, setScene] = useState<GuardianScene>("恋爱暧昧");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [roles, setRoles] = useState<GuardianRole[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const [{ items: cs }, { items: rs }] = await Promise.all([listContactsApi(), listGuardianRolesApi(scene)]);
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
  }, [scene]);

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_INVITE) return prev;
      return [...prev, id];
    });
  }

  function toggleRole(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICK) return prev;
      return [...prev, id];
    });
  }

  async function onSubmit() {
    if (selectedIds.length < 1) {
      setErr("请至少选择 1 位联系人");
      return;
    }
    if (picked.length < 1) {
      setErr("请至少选择 1 位 AI联系人");
      setGuardianOpen(true);
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

  return (
    <div className="aichat-shell guardian-create guardian-create--wechat">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          取消
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: 17 }}>发起群聊</h1>
          <p style={{ marginTop: 2 }}>选择联系人 · 可选群名称</p>
        </div>
        <span style={{ width: 44 }} aria-hidden />
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
          />
        </div>

        <section className="guardian-create-section">
          <h2 className="guardian-create-label">选择联系人</h2>
          {loading ? (
            <p className="aichat-muted-line">加载中…</p>
          ) : contacts.length === 0 ? (
            <p className="aichat-muted-line">请先在联系人中添加已注册用户</p>
          ) : (
            <ul className="guardian-contact-list">
              {contacts.map((c) => {
                const on = selectedIds.includes(c.contactUserId);
                return (
                  <li key={c.contactUserId}>
                    <button
                      type="button"
                      className={`guardian-contact-row${on ? " guardian-contact-row--on" : ""}`}
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

        <section className="guardian-create-section">
          <button
            type="button"
            className="guardian-guardian-toggle"
            onClick={() => setGuardianOpen((v) => !v)}
            aria-expanded={guardianOpen}
          >
            <span>AI联系人</span>
            <span className="guardian-guardian-toggle__meta">
              {scene} · 已选 {picked.length} 个
            </span>
            <span className="guardian-guardian-toggle__arrow">{guardianOpen ? "▾" : "▸"}</span>
          </button>

          {guardianOpen && (
            <div className="guardian-guardian-panel">
              <h3 className="guardian-create-label">场景</h3>
              <div className="guardian-scene-chips">
                {SCENES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`guardian-scene-chip${scene === s ? " guardian-scene-chip--on" : ""}`}
                    onClick={() => setScene(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <h3 className="guardian-create-label" style={{ marginTop: 14 }}>
                AI联系人（最多 {MAX_PICK} 位）
              </h3>
              <ul className="guardian-pick-list">
                {roles.map((r) => {
                  const on = picked.includes(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`guardian-pick-row guardian-pick-row--role${on ? " guardian-pick-row--on" : ""}`}
                        onClick={() => toggleRole(r.id)}
                      >
                        <GuardianAvatar role={r} className="guardian-pick-row__av" alt="" />
                        <span>
                          {r.name} · {r.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {err && <p className="aichat-form-msg err">{err}</p>}
      </div>

      <footer className="guardian-create-footer">
        <p className="guardian-create-footer__hint">
          已选 <strong>{selectedIds.length}</strong> 人 · 含你共 {selectedIds.length + 1} 人
        </p>
        <button
          type="button"
          className="aichat-btn-primary guardian-create-footer__btn"
          disabled={submitting || loading || selectedIds.length < 1}
          onClick={() => void onSubmit()}
        >
          {submitting ? "创建中…" : `完成${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
        </button>
      </footer>
    </div>
  );
}
