import { useCallback, useEffect, useRef, useState } from "react";
import { getDailyEntries } from "../../services/dailyLocalStorage";
import { DailyComposeMediaPage } from "../daily/DailyComposeMediaPage";
import { DailyComposeTextPage } from "../daily/DailyComposeTextPage";
import { DailyComposeVoicePage } from "../daily/DailyComposeVoicePage";
import { DailyFeed } from "../daily/DailyFeed";

type ComposeState =
  | null
  | { mode: "text" }
  | { mode: "voice" }
  | { mode: "photo" | "video"; file: File };

const DOCK_ITEMS = [
  { kind: "photo" as const, label: "拍照", iconClass: "daily-dock__icon--photo" },
  { kind: "video" as const, label: "拍视频", iconClass: "daily-dock__icon--video" },
  { kind: "text" as const, label: "写文字", iconClass: "daily-dock__icon--text" },
  { kind: "voice" as const, label: "语音", iconClass: "daily-dock__icon--voice" },
];

function DockIcon({ kind }: { kind: (typeof DOCK_ITEMS)[number]["kind"] }) {
  switch (kind) {
    case "photo":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "video":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      );
    case "text":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 6h16" />
          <path d="M12 6v14" />
          <path d="M8 20h8" />
        </svg>
      );
    case "voice":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="4" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      );
  }
}

export function DailyTab({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState(() => getDailyEntries());

  const bump = useCallback(() => setItems(getDailyEntries()), []);

  useEffect(() => {
    const onFocus = () => bump();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [bump]);

  const [compose, setCompose] = useState<ComposeState>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function onMediaPick(kind: "photo" | "video", file: File | undefined) {
    if (!file) return;
    setCompose({ mode: kind, file });
  }

  function closeCompose() {
    setCompose(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function finishCompose() {
    closeCompose();
    bump();
  }

  if (compose?.mode === "text") {
    return <DailyComposeTextPage onBack={closeCompose} onDone={finishCompose} />;
  }
  if (compose?.mode === "voice") {
    return <DailyComposeVoicePage onBack={closeCompose} onDone={finishCompose} />;
  }
  if (compose?.mode === "photo" || compose?.mode === "video") {
    return <DailyComposeMediaPage kind={compose.mode} file={compose.file} onBack={closeCompose} onDone={finishCompose} />;
  }

  return (
    <div className="aichat-main-shell-tab daily-tab">
      <header className="aichat-topbar aichat-topbar-flex daily-tab__topbar">
        {onBack ? (
          <button type="button" className="aichat-btn-ghost yiyi-tab__topbar-back" onClick={onBack}>
            返回
          </button>
        ) : (
          <span className="yiyi-tab__topbar-spacer" aria-hidden />
        )}
        <div className="aichat-stage-head">
          <h1>日常</h1>
        </div>
        <span className="yiyi-tab__topbar-spacer" aria-hidden />
      </header>

      <div className="daily-tab__scroll">
        <p className="daily-tab__privacy" role="note">
          仅记录，不对任何人展示
        </p>
        <div className="daily-tab__section-head">
          <h2>我的记录</h2>
          {items.length > 0 ? <span>共 {items.length} 条</span> : null}
        </div>
        <DailyFeed items={items} onChanged={bump} />
      </div>

      <div className="daily-tab__dock" role="group" aria-label="记录">
        {DOCK_ITEMS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="daily-dock__btn"
            onClick={() => {
              if (item.kind === "text") setCompose({ mode: "text" });
              else if (item.kind === "voice") setCompose({ mode: "voice" });
              else if (item.kind === "photo") photoInputRef.current?.click();
              else videoInputRef.current?.click();
            }}
          >
            <span className={`daily-dock__icon ${item.iconClass}`} aria-hidden>
              <DockIcon kind={item.kind} />
            </span>
            <span className="daily-dock__label">{item.label}</span>
          </button>
        ))}
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onMediaPick("photo", e.target.files?.[0])}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => onMediaPick("video", e.target.files?.[0])}
      />
    </div>
  );
}
