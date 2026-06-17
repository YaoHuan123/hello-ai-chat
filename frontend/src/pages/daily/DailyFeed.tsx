import { useRef, useState } from "react";
import { removeDailyEntry, updateDailyEntry } from "../../services/dailyLocalStorage";
import { DAILY_KIND_LABEL, type DailyEntry } from "../../types/daily";
import { formatDurationMs, formatRowTime, groupDailyEntriesByDay } from "./dailyFeedUtils";

type Props = {
  items: DailyEntry[];
  onChanged: () => void;
};

function VoiceRow({ entry }: { entry: DailyEntry }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    if (!entry.mediaUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(entry.mediaUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true)).catch(() => {
      window.alert("无法播放语音。");
    });
  }

  return (
    <div className="daily-feed__voice">
      <button type="button" className="daily-feed__voice-play" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="daily-feed__voice-wave" aria-hidden />
      <span className="daily-feed__voice-dur">{formatDurationMs(entry.durationMs ?? 0)}</span>
    </div>
  );
}

export function DailyFeed({ items, onChanged }: Props) {
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DailyEntry | null>(null);
  const [editText, setEditText] = useState("");

  function onDelete(id: string) {
    if (!window.confirm("确定删除？")) return;
    removeDailyEntry(id);
    onChanged();
  }

  function openEdit(entry: DailyEntry) {
    setEditing(entry);
    setEditText(entry.text);
    setMenuItemId(null);
  }

  function saveEdit() {
    if (!editing) return;
    updateDailyEntry(editing.id, { text: editText.trim() });
    setEditing(null);
    onChanged();
  }

  if (items.length === 0) {
    return (
      <div className="daily-feed__empty">
        <p>从下方选择方式，开始记录。内容仅自己可见。</p>
      </div>
    );
  }

  const dayGroups = groupDailyEntriesByDay(items);

  return (
    <>
      {dayGroups.map((group) => (
        <section key={group.dayKey} className="daily-feed__day">
          <h3 className="daily-feed__day-title">
            <time dateTime={group.dayIso}>{group.dayLabel}</time>
          </h3>
          <ul className="daily-feed__list">
            {group.items.map((entry) => (
              <li key={entry.id} className="daily-feed__row">
                <time className="daily-feed__row-time" dateTime={new Date(entry.ts).toISOString()}>
                  {formatRowTime(entry.ts)}
                </time>
                <div className="daily-feed__row-main">
                  <span className={`daily-feed__badge daily-feed__badge--${entry.kind}`}>{DAILY_KIND_LABEL[entry.kind]}</span>
                  {entry.text ? <p className="daily-feed__text">{entry.text}</p> : null}
                  {entry.kind === "voice" ? <VoiceRow entry={entry} /> : null}
                </div>
                {(entry.kind === "photo" || entry.kind === "video") && entry.mediaUrl ? (
                  <div className="daily-feed__thumb">
                    {entry.kind === "photo" ? (
                      <img src={entry.mediaUrl} alt="" />
                    ) : (
                      <>
                        <video src={entry.mediaUrl} muted playsInline preload="metadata" />
                        <span className="daily-feed__thumb-play" aria-hidden>
                          ▶
                        </span>
                        {entry.durationMs ? (
                          <span className="daily-feed__thumb-dur">{formatDurationMs(entry.durationMs)}</span>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
                <div className="daily-feed__more-wrap">
                  <button
                    type="button"
                    className="daily-feed__more"
                    aria-label="更多"
                    aria-expanded={menuItemId === entry.id}
                    aria-haspopup="menu"
                    onClick={() => setMenuItemId((id) => (id === entry.id ? null : entry.id))}
                  >
                    ⋯
                  </button>
                  {menuItemId === entry.id ? (
                    <>
                      <div className="moments-feed-menu-backdrop" role="presentation" onClick={() => setMenuItemId(null)} />
                      <div className="moments-feed-menu" role="menu">
                        {entry.kind !== "voice" ? (
                          <button type="button" className="moments-feed-menu__item" role="menuitem" onClick={() => openEdit(entry)}>
                            编辑
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="moments-feed-menu__item moments-feed-menu__item--danger"
                          role="menuitem"
                          onClick={() => {
                            setMenuItemId(null);
                            onDelete(entry.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing ? (
        <div
          className="aichat-moldt-info-back"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h4 className="aichat-moldt-info-form__h">编辑</h4>
            <label className="aichat-moldt-info-form__lab" htmlFor="daily-edit-text">
              内容
            </label>
            <textarea
              id="daily-edit-text"
              className="aichat-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={5}
              maxLength={4000}
            />
            <div className="aichat-moldt-info-form__act">
              <button type="button" className="aichat-btn-ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={saveEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
