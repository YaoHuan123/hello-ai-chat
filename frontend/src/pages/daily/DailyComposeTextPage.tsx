import { useState } from "react";
import { addDailyEntry, nextDailyEntryId } from "../../services/dailyLocalStorage";

type Props = {
  onBack: () => void;
  onDone: () => void;
};

export function DailyComposeTextPage({ onBack, onDone }: Props) {
  const [body, setBody] = useState("");
  const canPublish = body.trim().length > 0;

  function publish() {
    const text = body.trim();
    if (!text) return;
    addDailyEntry({ id: nextDailyEntryId(), kind: "text", text, ts: Date.now() });
    onDone();
  }

  return (
    <div className="aichat-shell daily-compose-page">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          取消
        </button>
        <div className="aichat-stage-head">
          <h1>写文字</h1>
        </div>
        <button type="button" className="moments-layered-topbar__btn" onClick={publish} disabled={!canPublish}>
          保存
        </button>
      </header>
      <div className="aichat-main moments-add-page__main">
        <div className="moments-add-compose-wrap">
          <textarea
            className="moments-add-compose-wrap__input"
            placeholder="写点什么…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
