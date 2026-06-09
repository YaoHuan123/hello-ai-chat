import { useState } from "react";
import { addPassiveCloneItem } from "../../services/passiveCloneLocalStorage";

type Props = {
  onBack: () => void;
  /** 发布自由动态后返回动态列表 */
  onDone: () => void;
};

function nextId(): string {
  return `pcf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MomentsAddPage({ onBack, onDone }: Props) {
  const [body, setBody] = useState("");
  const canPublish = body.trim().length > 0;

  function publishFree() {
    const text = body.trim();
    if (!text) return;
    addPassiveCloneItem({ id: nextId(), type: "free", title: "", body: text, ts: Date.now() });
    setBody("");
    onDone();
  }

  return (
    <div className="aichat-shell moments-add-page moments-add-page--layered">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>添加</h1>
        </div>
        <button
          type="button"
          className="moments-layered-topbar__btn"
          onClick={publishFree}
          disabled={!canPublish}
        >
          发布
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
