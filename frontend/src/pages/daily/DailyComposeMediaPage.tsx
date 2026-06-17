import { useEffect, useState } from "react";
import { addDailyEntry, nextDailyEntryId } from "../../services/dailyLocalStorage";

const MAX_MEDIA_BYTES = 12 * 1024 * 1024;

type Props = {
  kind: "photo" | "video";
  file: File;
  onBack: () => void;
  onDone: () => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function loadVideoDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0);
    video.onerror = () => reject(new Error("无法读取视频信息"));
    video.src = objectUrl;
  });
}

export function DailyComposeMediaPage({ kind, file, onBack, onDone }: Props) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [durationMs, setDurationMs] = useState<number | undefined>();
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (file.size > MAX_MEDIA_BYTES) {
      setErr(`文件过大（上限 ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)}MB）。`);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    if (kind === "video") {
      void loadVideoDuration(objectUrl)
        .then(setDurationMs)
        .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
    }
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, kind]);

  async function publish() {
    if (!previewUrl || err || publishing) return;
    setPublishing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      addDailyEntry({
        id: nextDailyEntryId(),
        kind,
        text: caption.trim(),
        mediaUrl: dataUrl,
        durationMs: kind === "video" ? durationMs : undefined,
        ts: Date.now(),
      });
      onDone();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "保存失败，存储空间可能不足。");
    } finally {
      setPublishing(false);
    }
  }

  const title = kind === "photo" ? "拍照" : "拍视频";

  return (
    <div className="aichat-shell daily-compose-page">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          取消
        </button>
        <div className="aichat-stage-head">
          <h1>{title}</h1>
        </div>
        <button type="button" className="moments-layered-topbar__btn" onClick={() => void publish()} disabled={!!err || !previewUrl || publishing}>
          保存
        </button>
      </header>
      <div className="aichat-main daily-compose-page__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        {previewUrl ? (
          <>
            <div className="daily-compose-page__preview">
              {kind === "photo" ? <img src={previewUrl} alt="" /> : <video src={previewUrl} controls playsInline />}
            </div>
            <textarea
              className="aichat-textarea daily-compose-page__caption"
              placeholder="添加说明（可选）"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
