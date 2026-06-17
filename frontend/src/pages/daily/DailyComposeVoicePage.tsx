import { useEffect, useRef, useState } from "react";
import { addDailyEntry, nextDailyEntryId } from "../../services/dailyLocalStorage";
import { formatDurationMs } from "./dailyFeedUtils";

type Props = {
  onBack: () => void;
  onDone: () => void;
};

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取录音失败"));
    reader.readAsDataURL(blob);
  });
}

export function DailyComposeVoicePage({ onBack, onDone }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [err, setErr] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setErr("");
    setPreviewUrl("");
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setDurationMs(Date.now() - startedAtRef.current);
    };
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setRecording(false);
  }

  async function publish() {
    if (!previewUrl || publishing) return;
    setPublishing(true);
    try {
      const blob = await fetch(previewUrl).then((r) => r.blob());
      const dataUrl = await readBlobAsDataUrl(blob);
      addDailyEntry({
        id: nextDailyEntryId(),
        kind: "voice",
        text: "",
        mediaUrl: dataUrl,
        durationMs,
        ts: Date.now(),
      });
      onDone();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "保存失败。");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="aichat-shell daily-compose-page">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          取消
        </button>
        <div className="aichat-stage-head">
          <h1>语音</h1>
        </div>
        <button type="button" className="moments-layered-topbar__btn" onClick={() => void publish()} disabled={!previewUrl || publishing}>
          保存
        </button>
      </header>
      <div className="aichat-main daily-compose-page__main daily-compose-page__main--voice">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        <p className="daily-compose-page__voice-time">{formatDurationMs(recording ? elapsedMs : durationMs)}</p>
        {!previewUrl ? (
          <button
            type="button"
            className={`daily-compose-page__record-btn ${recording ? "daily-compose-page__record-btn--active" : ""}`}
            onClick={() => {
              if (recording) stopRecording();
              else {
                void startRecording().catch((e: unknown) => {
                  setErr(e instanceof Error ? e.message : "无法访问麦克风。");
                });
              }
            }}
          >
            {recording ? "停止" : "开始录音"}
          </button>
        ) : (
          <>
            <div className="daily-feed__voice daily-compose-page__voice-preview">
              <audio src={previewUrl} controls />
            </div>
            <button
              type="button"
              className="aichat-btn-ghost daily-compose-page__re-record"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl("");
                setDurationMs(0);
              }}
            >
              重新录制
            </button>
          </>
        )}
      </div>
    </div>
  );
}
