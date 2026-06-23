import { YIYI } from "../../constants/productCopy";
import { useCallback, useEffect, useState } from "react";
import { loadYiyiState, saveYiyiPermissions } from "../../services/yiyiClient";
import type { YiyiPermissions } from "../../types/yiyi";

type Props = {
  onBack: () => void;
};

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`yiyi-toggle${on ? " yiyi-toggle--on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
    />
  );
}

export function YiyiSettingsPage({ onBack }: Props) {
  const [perms, setPerms] = useState<YiyiPermissions | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiState()
      .then((s) => setPerms(s.permissions))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function patch(p: Partial<YiyiPermissions>) {
    if (!perms) return;
    const prev = perms;
    const next = { ...perms, ...p };
    setPerms(next);
    setSaving(true);
    setErr("");
    try {
      const saved = await saveYiyiPermissions(p);
      setPerms(saved);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setPerms(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="aichat-shell yiyi-subpage">
      <header className="aichat-topbar aichat-topbar-flex yiyi-subpage__topbar">
        <button type="button" className="aichat-btn-ghost" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>{YIYI.settings}</h1>
        </div>
        <span className="yiyi-tab__topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main yiyi-subpage__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        {loading ? <p className="yiyi-empty">加载中…</p> : null}

        <p className="yiyi-intro">{YIYI.settingsIntro}</p>

        {perms ? (
          <>
            <section className="yiyi-settings-group" aria-label="权限">
              <div className="yiyi-settings-row">
                <div className="yiyi-settings-row__body">
                  <strong>允许对方添加好友</strong>
                  <span>仅在出现有效沟通后生效。开启后对方可申请加你为联系人。</span>
                </div>
                <Toggle
                  label="允许对方添加好友"
                  on={perms.allowAddFriend}
                  disabled={saving}
                  onChange={(v) => void patch({ allowAddFriend: v })}
                />
              </div>
            </section>

            <section className="yiyi-settings-group" aria-label="活跃状态">
              <div className="yiyi-settings-row">
                <div className="yiyi-settings-row__body">
                  <strong>{YIYI.activeToggle}</strong>
                  <span>{YIYI.activeToggleDesc}</span>
                </div>
                <Toggle label={YIYI.activeToggle} on={perms.yiyiActive} disabled={saving} onChange={(v) => void patch({ yiyiActive: v })} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
