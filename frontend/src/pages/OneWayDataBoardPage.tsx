import { useEffect, useState } from "react";
import { getOneWayDataBoard, type DataBoardSnapshot } from "../services/stageApi";

type Props = { onBack: () => void };

export function OneWayDataBoardPage({ onBack }: Props) {
  const [data, setData] = useState<DataBoardSnapshot | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getOneWayDataBoard()
      .then(setData)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>单向体数据</h1>
          <p>聚合后指标</p>
        </div>
        <div className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main aichat-page-main">
        {err && <p className="aichat-form-msg err">{err}</p>}
        {!data ? (
          <div className="aichat-card">正在加载数据...</div>
        ) : (
          <div className="aichat-page-stack">
            <div className="aichat-card aichat-kpi-grid">
              <div>
                <p className="aichat-kpi-label">会话数</p>
                <p className="aichat-kpi-value">{data.totalConversations}</p>
              </div>
              <div>
                <p className="aichat-kpi-label">喂养项</p>
                <p className="aichat-kpi-value">{data.totalFeedingItems}</p>
              </div>
              <div>
                <p className="aichat-kpi-label">可信度</p>
                <p className="aichat-kpi-value">{data.confidence}</p>
              </div>
            </div>

            <div className="aichat-card aichat-page-card">
              <h2 className="aichat-panel-title">近期信号</h2>
              <ul className="aichat-list">
                {data.recentSignals.map((s) => (
                  <li key={s.id} className="aichat-signal-item">
                    <span>{s.title}</span>
                    <strong>{s.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
