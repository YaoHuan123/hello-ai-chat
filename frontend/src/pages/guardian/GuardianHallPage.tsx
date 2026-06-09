import { useEffect, useState } from "react";
import { listGuardianRolesApi } from "../../services/guardianApi";
import type { GuardianRole, GuardianScene } from "../../types/guardian";

type Props = {
  onBack: () => void;
};

const SCENES: GuardianScene[] = ["恋爱暧昧", "校园师生", "家庭亲子"];

export function GuardianHallPage({ onBack }: Props) {
  const [scene, setScene] = useState<GuardianScene | "全部">("全部");
  const [roles, setRoles] = useState<GuardianRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const { items } = await listGuardianRolesApi(scene === "全部" ? undefined : scene);
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
  }, [scene]);

  return (
    <div className="aichat-shell guardian-hall">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: 17 }}>AI联系人</h1>
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main">
        <div className="guardian-scene-chips" role="tablist" aria-label="场景筛选">
          {(["全部", ...SCENES] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scene === s}
              className={`guardian-scene-chip${scene === s ? " guardian-scene-chip--on" : ""}`}
              onClick={() => setScene(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {err && <p className="aichat-form-msg err">{err}</p>}
        {loading ? null : (
          <ul className="guardian-role-list" aria-label="AI联系人列表">
            {roles.map((r) => (
              <li key={r.id} className="guardian-role-card">
                <div className="guardian-role-card__avatar" style={{ background: r.avatarColor }}>
                  {r.name.slice(0, 1)}
                </div>
                <div className="guardian-role-card__body">
                  <div className="guardian-role-card__head">
                    <span className="guardian-role-card__name">{r.name}</span>
                    <span className="guardian-role-card__scene">{r.scene}</span>
                  </div>
                  <p className="guardian-role-card__title">{r.title}</p>
                  <p className="guardian-role-card__tagline">「{r.tagline}」</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
