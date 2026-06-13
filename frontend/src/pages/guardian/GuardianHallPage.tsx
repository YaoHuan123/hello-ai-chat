import { useEffect, useState, type CSSProperties } from "react";
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
          <h1>搭子</h1>
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main guardian-hall__main">
        <section className="guardian-hall__banner" aria-label="介绍">
          <p className="guardian-hall__banner-kicker">群聊搭子</p>
          <p className="guardian-hall__banner-title">挑几位，进群帮你盯场子</p>
          <p className="guardian-hall__banner-sub">每人性格与立场不同：有的中立疏导，有的协调事务，有的会按人设护一方</p>
        </section>

        {err && <p className="aichat-form-msg err">{err}</p>}
        {loading ? (
          <p className="aichat-muted-line">正在加载…</p>
        ) : (
          <ul className="guardian-role-list guardian-role-list--hall" aria-label="搭子列表">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="guardian-role-card-v2"
                  data-scene={r.scene}
                  style={roleCardStyle(r)}
                  onClick={() => onOpenRole(r.id)}
                >
                  <span className="guardian-role-card-v2__shine" aria-hidden />
                  <GuardianAvatar role={r} className="guardian-role-card-v2__avatar" alt="" />
                  <span className="guardian-role-card-v2__body">
                    <strong className="guardian-role-card-v2__name">{r.name}</strong>
                    {r.userMessage.trim() ? (
                      <span className="guardian-role-card-v2__tagline">{r.userMessage}</span>
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
