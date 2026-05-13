import { useEffect, useRef, useState } from "react";
import { getOneWaySession, sendOneWayMessage, type OneWayMessage } from "../services/stageApi";

type Props = { onBack: () => void };

export function OneWayVisitorPage({ onBack }: Props) {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<OneWayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const scRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOneWaySession()
      .then((res) => {
        setSessionId(res.sessionId);
        setMessages(res.messages);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (scRef.current) scRef.current.scrollTop = scRef.current.scrollHeight;
  }, [messages]);

  async function onSend() {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setSending(true);
    setErr("");
    const visitorMessage: OneWayMessage = {
      id: `local-${Date.now()}`,
      role: "visitor",
      text,
      time: new Date().toTimeString().slice(0, 5),
    };
    setMessages((prev) => [...prev, visitorMessage]);
    setInput("");
    try {
      const reply = await sendOneWayMessage(sessionId, text);
      setMessages((prev) => [...prev, reply]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>单向会话</h1>
          <p>仅访客与智能体可见</p>
        </div>
        <div className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main aichat-page-main">
        {err && <p className="aichat-form-msg err">{err}</p>}

        <div className="aichat-card aichat-page-card aichat-chat-panel">
          <div className="aichat-panel-head">
            <h2 className="aichat-panel-title">会话</h2>
            {sending && <span className="aichat-tag-muted">生成中</span>}
          </div>

          <div className="aichat-mini-chat aichat-mini-chat--tall" ref={scRef}>
            {loading ? (
              <p className="aichat-muted-line">正在加载会话...</p>
            ) : messages.length === 0 ? (
              <p className="aichat-muted-line">暂无消息，开始你的第一句。</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`aichat-mini-line ${m.role === "visitor" ? "mine" : "other"}`}>
                  <p>{m.text}</p>
                  <span>{m.time}</span>
                </div>
              ))
            )}
          </div>

          <div className="aichat-inline-row">
            <input
              className="aichat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息"
              disabled={loading || sending}
            />
            <button
              className="aichat-btn-primary aichat-btn-fit"
              type="button"
              onClick={onSend}
              disabled={!input.trim() || loading || sending}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
