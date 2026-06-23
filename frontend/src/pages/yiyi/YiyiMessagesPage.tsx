import { YIYI } from "../../constants/productCopy";
import { useCallback, useEffect, useState } from "react";
import { YiyiAvatar } from "../../components/YiyiAvatar";
import { loadYiyiBridges, runYiyiMatch } from "../../services/yiyiClient";
import type { YiyiBridgeMessage } from "../../types/yiyi";

type Props = {
  onBack: () => void;
};

function formatBridgeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return "昨天";
}

export function YiyiMessagesPage({ onBack }: Props) {
  const [items, setItems] = useState<YiyiBridgeMessage[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiBridges()
      .then(setItems)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onMatch() {
    if (matching) return;
    setMatching(true);
    setErr("");
    try {
      await runYiyiMatch();
      reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setMatching(false);
    }
  }

  const effectiveCount = items.filter((x) => x.status === "effective").length;

  return (
    <div className="aichat-shell yiyi-subpage">
      <header className="aichat-topbar aichat-topbar-flex yiyi-subpage__topbar">
        <button type="button" className="aichat-btn-ghost" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>{YIYI.messages}</h1>
        </div>
        <button type="button" className="yiyi-tab__topbar-link" onClick={() => void onMatch()} disabled={matching}>
          {matching ? "匹配中" : "匹配"}
        </button>
      </header>

      <div className="aichat-main yiyi-subpage__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        <p className="yiyi-intro">
          {YIYI.messagesDesc}
          {effectiveCount > 0 ? ` 当前有 ${effectiveCount} 条有效沟通。` : ""}
        </p>

        {loading ? <p className="yiyi-empty">加载中…</p> : null}

        {!loading && items.length === 0 ? <p className="yiyi-empty">{YIYI.emptyMessages}</p> : null}

        {items.map((item) => (
          <article key={item.id} className={`yiyi-bridge-card${item.status === "blocked" ? " yiyi-bridge-card--muted" : ""}`}>
            <div className="yiyi-bridge-card__head">
              <div className="yiyi-bridge-card__avatars" aria-hidden>
                <YiyiAvatar className="yiyi-avatar yiyi-avatar--sm" />
                <span className="yiyi-avatar yiyi-avatar--sm yiyi-avatar--peer" style={{ background: item.peerAccent }}>
                  Y
                </span>
              </div>
              <div>
                <div className="yiyi-bridge-card__title">{YIYI.bridgeTitle(item.peerLabel)}</div>
                <div className={`yiyi-bridge-card__status${item.status === "effective" ? " yiyi-bridge-card__status--ok" : ""}`}>
                  {item.status === "effective" ? `有效沟通 · ${formatBridgeTime(item.ts)}` : "未通过 · 已拦截"}
                </div>
              </div>
            </div>
            <p className="yiyi-bridge-card__preview">{item.preview}</p>
            {item.tags.length > 0 ? (
              <div className="yiyi-bridge-card__tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="yiyi-bridge-tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
