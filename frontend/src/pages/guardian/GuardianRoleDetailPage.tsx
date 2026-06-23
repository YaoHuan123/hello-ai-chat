import { GUARDIAN } from "../../constants/productCopy";
import { useEffect, useState, type CSSProperties } from "react";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { getGuardianRoleApi } from "../../services/guardianApi";
import type { GuardianRole } from "../../types/guardian";
import { GUARDIAN_STANCE_LABEL } from "../../types/guardian";

type Props = {
  roleId: string;
  onBack: () => void;
};

type TagVariant = "neutral" | "accent" | "boundary";

function TagList({ items, variant = "neutral" }: { items: string[]; variant?: TagVariant }) {
  if (items.length === 0) return null;
  return (
    <div className="guardian-role-detail__tags">
      {items.map((t) => (
        <span key={t} className={`guardian-role-detail__tag guardian-role-detail__tag--${variant}`}>
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
          if (!found) setLoadErr(GUARDIAN.notFound);
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

  const shellStyle = role
    ? ({ "--guardian-role-accent": role.avatarColor } as CSSProperties)
    : undefined;

  return (
    <div
      className="aichat-shell guardian-role-detail"
      data-scene={role?.scene}
      style={shellStyle}
    >
      <header className="guardian-role-detail__topbar">
        <button className="guardian-role-detail__back" type="button" onClick={onBack}>
          返回
        </button>
        <div className="guardian-role-detail__topbar-spacer" aria-hidden />
      </header>

      <div className="guardian-role-detail__main">
        {loading ? (
          <p className="guardian-role-detail__status">正在加载…</p>
        ) : loadErr ? (
          <p className="aichat-form-msg err">{loadErr}</p>
        ) : role ? (
          <>
            <section className="guardian-role-detail__hero" aria-label={`${role.name}简介`}>
              <div className="guardian-role-detail__hero-bg" aria-hidden />
              <div className="guardian-role-detail__hero-inner">
                <div className="guardian-role-detail__avatar-ring">
                  <GuardianAvatar role={role} className="guardian-role-detail__avatar" alt="" />
                </div>
                <h1 className="guardian-role-detail__name">{role.name}</h1>
                <div className="guardian-role-detail__meta">
                  <span className="guardian-role-detail__scene">{role.scene}</span>
                  <span className="guardian-role-detail__stance">{GUARDIAN_STANCE_LABEL[role.stance]}</span>
                </div>
              </div>
            </section>

            <section className="guardian-role-detail__pitch">
              {role.userMessage.trim() ? (
                <blockquote className="guardian-role-detail__quote" aria-label={`${role.name}对你说`}>
                  <span className="guardian-role-detail__quote-mark" aria-hidden>
                    "
                  </span>
                  {role.userMessage}
                </blockquote>
              ) : null}
              {role.stanceNote.trim() ? (
                <p className="guardian-role-detail__stance-note">{role.stanceNote}</p>
              ) : null}
            </section>

            <div className="guardian-role-detail__deck">
              <section className="guardian-role-detail__card guardian-role-detail__card--spot">
                <h2 className="guardian-role-detail__card-title">
                  <span className="guardian-role-detail__card-icon" aria-hidden>
                    ◎
                  </span>
                  一眼识破
                </h2>
                <TagList items={role.triggers} variant="neutral" />
              </section>

              <section className="guardian-role-detail__card guardian-role-detail__card--move">
                <h2 className="guardian-role-detail__card-title">
                  <span className="guardian-role-detail__card-icon" aria-hidden>
                    ✦
                  </span>
                  这样接话
                </h2>
                <TagList items={role.guardActions} variant="accent" />
              </section>

              <section className="guardian-role-detail__card guardian-role-detail__card--boundary">
                <h2 className="guardian-role-detail__card-title">
                  <span className="guardian-role-detail__card-icon" aria-hidden>
                    △
                  </span>
                  绝不碰
                </h2>
                <TagList items={role.forbidden} variant="boundary" />
              </section>
            </div>

            {role.sampleProactiveLines.length > 0 ? (
              <section className="guardian-role-detail__samples" aria-label="群聊片段">
                <h2 className="guardian-role-detail__samples-title">群聊片段</h2>
                <div className="guardian-role-detail__sample-stage">
                  <ul className="guardian-role-detail__sample-list">
                    {role.sampleProactiveLines.map((line, i) => (
                      <li key={line} className={`guardian-role-detail__sample-item guardian-role-detail__sample-item--${i % 2}`}>
                        <div className="guardian-role-detail__sample-bubble">
                          <span className="guardian-role-detail__sample-name">{role.name}</span>
                          <p>{line}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
