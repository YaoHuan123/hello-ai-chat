import { useEffect, useState } from "react";
import { fetchHotTopicsApi } from "../../services/momentsApi";
import { getPassiveCloneItems } from "../../services/passiveCloneLocalStorage";
import { flushMomentsSync } from "../../services/momentsSync";
import type { PassiveTopic } from "../../types/passiveClone";
import { MomentsTopicSection } from "./passive/MomentsTopicSection";

type Props = {
  onBack: () => void;
};

function formatUpdatedAt(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MomentsHotTopicsPage({ onBack }: Props) {
  const [epoch, setEpoch] = useState(0);
  const [topics, setTopics] = useState<PassiveTopic[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchHotTopicsApi()
      .then((res) => {
        if (cancelled) return;
        setTopics(res.topics);
        setUpdatedAt(res.updatedAt);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setTopics([]);
        setUpdatedAt(null);
        setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [epoch]);

  function onCollected() {
    flushMomentsSync(getPassiveCloneItems());
    setEpoch((e) => e + 1);
  }

  return (
    <div className="aichat-shell moments-hot-page moments-hot-page--layered">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>热点</h1>
          {updatedAt ? <p className="moments-hot-page__updated">更新于 {formatUpdatedAt(updatedAt)}</p> : null}
        </div>
        <div className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main aichat-page-main moments-hot-page__main">
        {loading ? <p className="moments-hot-page__status">加载中…</p> : null}
        {!loading && error ? <p className="moments-hot-page__status moments-hot-page__status--error">{error}</p> : null}
        {!loading && !error && topics.length > 0 ? (
          <MomentsTopicSection key={epoch} title="" topics={topics} onCollected={onCollected} variant="layered" />
        ) : null}
        {!loading && !error && topics.length === 0 ? <p className="moments-hot-page__status">暂无热点问题</p> : null}
      </div>
    </div>
  );
}
