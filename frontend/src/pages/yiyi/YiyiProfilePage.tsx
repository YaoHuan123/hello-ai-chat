import { useCallback, useEffect, useState } from "react";
import { YIYI } from "../../constants/productCopy";
import { YiyiProfileBlock } from "../../components/YiyiProfileBlock";
import { loadYiyiState } from "../../services/yiyiClient";
import type { YiyiProfile } from "../../types/yiyi";

type Props = {
  onBack: () => void;
  onContinueChat: () => void;
};

export function YiyiProfilePage({ onBack, onContinueChat }: Props) {
  const [profile, setProfile] = useState<YiyiProfile | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiState()
      .then((s) => setProfile(s.profile))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="aichat-shell yiyi-subpage">
      <header className="aichat-topbar aichat-topbar-flex yiyi-subpage__topbar">
        <button type="button" className="aichat-btn-ghost" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>{YIYI.profile}</h1>
        </div>
        <span className="yiyi-tab__topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main yiyi-subpage__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        {loading && !profile ? <p className="yiyi-empty">加载中…</p> : null}
        {profile ? (
          <>
            <YiyiProfileBlock profile={profile} />
            <button type="button" className="yiyi-cta" onClick={onContinueChat}>
              {YIYI.continueChat}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
