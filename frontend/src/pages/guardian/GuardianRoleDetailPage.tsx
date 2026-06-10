import { useEffect, useState } from "react";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { getGuardianRoleApi } from "../../services/guardianApi";
import { GUARDIAN_SCENE_HINT, type GuardianRole } from "../../types/guardian";

type Props = {
  roleId: string;
  onBack: () => void;
};

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="guardian-role-detail__tags">
      {items.map((t) => (
        <span key={t} className="guardian-role-detail__tag">
          {t}
        </span>
      ))}
    </div>
  );
}

export function GuardianRoleDetailPage({ roleId, onBack }: Props) {
  const [role, setRole] = useState<GuardianRole | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadErr("");
      try {
        const found = await getGuardianRoleApi(roleId);
        if (!cancelled) {
          if (!found) setLoadErr("未找到该 AI 联系人。");
          else setRole(found);
        }
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  return (
    <div className="aichat-shell guardian-role-detail">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: 17 }}>{role?.name ?? "AI 联系人"}</h1>
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main guardian-role-detail__main">
        {loading ? (
          <p className="aichat-muted-line">正在加载…</p>
        ) : loadErr ? (
          <p className="aichat-form-msg err">{loadErr}</p>
        ) : role ? (
          <>
            <div className="guardian-role-detail__hero">
              <GuardianAvatar role={role} className="guardian-role-detail__avatar" alt="" />
              <div className="guardian-role-detail__hero-text">
                <h2 className="guardian-role-detail__name">{role.name}</h2>
                <p className="guardian-role-detail__title">{role.title}</p>
                <span className="guardian-role-detail__scene">{role.scene}</span>
              </div>
            </div>

            <p className="guardian-role-detail__scene-hint">{GUARDIAN_SCENE_HINT[role.scene]}</p>

            <section className="guardian-role-detail__section">
              <h3 className="guardian-role-detail__label">人设金句</h3>
              <p className="guardian-role-detail__quote">「{role.tagline}」</p>
            </section>

            <section className="guardian-role-detail__section">
              <h3 className="guardian-role-detail__label">说话风格</h3>
              <p className="guardian-role-detail__text">{role.speechStyle}</p>
            </section>

            <section className="guardian-role-detail__section">
              <h3 className="guardian-role-detail__label">关注触发</h3>
              <TagList items={role.triggers} />
            </section>

            <section className="guardian-role-detail__section">
              <h3 className="guardian-role-detail__label">护场方式</h3>
              <TagList items={role.guardActions} />
            </section>

            <section className="guardian-role-detail__section">
              <h3 className="guardian-role-detail__label">禁忌</h3>
              <TagList items={role.forbidden} />
            </section>

            {role.sampleProactiveLines.length > 0 ? (
              <section className="guardian-role-detail__section">
                <h3 className="guardian-role-detail__label">示例发言</h3>
                <ul className="guardian-role-detail__samples">
                  {role.sampleProactiveLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
