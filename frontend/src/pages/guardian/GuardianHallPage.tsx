import { useEffect, useState, type CSSProperties } from "react";
import { GUARDIAN } from "../../constants/productCopy";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { listGuardianRolesApi } from "../../services/guardianApi";
import type { GuardianRole } from "../../types/guardian";

type Props = {
  onBack: () => void;
  onOpenRole: (roleId: string) => void;
};

function roleCardStyle(role: GuardianRole): CSSProperties {
  return {
    "--guardian-role-accent": role.avatarColor,
  } as CSSProperties;
}

export function GuardianHallPage({ onBack, onOpenRole }: Props) {
  const [roles, setRoles] = useState<GuardianRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const { items } = await listGuardianRolesApi();
        if (!cancelled) setRoles(items);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="aichat-shell guardian-hall">
      <header className="aichat-topbar aichat-topbar-flex guardian-hall__topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head guardian-hall__head">
          <h1>{GUARDIAN.name}</h1>
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main guardian-hall__main">
        <section className="guardian-hall__banner" aria-label="介绍">
          <p className="guardian-hall__banner-kicker">{GUARDIAN.hallKicker}</p>
          <p className="guardian-hall__banner-title">{GUARDIAN.hallTitle}</p>
          <p className="guardian-hall__banner-sub">{GUARDIAN.hallSub}</p>
        </section>

        {err && <p className="aichat-form-msg err">{err}</p>}
        {loading ? (
          <p className="aichat-muted-line">加载中…</p>
        ) : roles.length === 0 ? (
          <p className="aichat-muted-line">暂无{GUARDIAN.name}角色</p>
        ) : (
          <ul className="guardian-role-list guardian-role-list--hall" aria-label={`${GUARDIAN.name}列表`}>
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  className="guardian-role-card-v2"
                  data-scene={role.scene}
                  style={roleCardStyle(role)}
                  onClick={() => onOpenRole(role.id)}
                >
                  <span className="guardian-role-card-v2__shine" aria-hidden />
                  <GuardianAvatar role={role} className="guardian-role-card-v2__avatar" alt="" />
                  <span className="guardian-role-card-v2__body">
                    <strong className="guardian-role-card-v2__name">{role.name}</strong>
                    {role.userMessage.trim() ? (
                      <span className="guardian-role-card-v2__tagline">{role.userMessage}</span>
                    ) : null}
                  </span>
                  <span className="guardian-role-card-v2__chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
