import { useEffect, useRef, useState } from "react";
import {
  appendMomentsExploreMessages,
  getMomentsExploreMessages,
} from "../../services/momentsExploreChatLocalStorage";
import { momentsExploreReplyApi, type ExploreChatLine } from "../../services/momentsApi";
import type { ContactItem } from "../../types/contact";
import type { ChatLocalMessage } from "../../types/chat";
import { MOMENTS_EXPLORE_ERROR_REPLY, MOMENTS_EXPLORE_FALLBACK_REPLY } from "../../types/momentsExplore";

type Props = {
  contact: ContactItem;
  onBack: () => void;
};

function maskPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

function titleFor(c: ContactItem): string {
  const r = c.remark?.trim();
  if (r) return r;
  return maskPhoneDisplay(c.phone);
}

function nextId(): string {
  return `mex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toExploreHistory(messages: ChatLocalMessage[]): ExploreChatLine[] {
  return messages.map((m) => ({
    from: m.from === "me" ? ("explorer" as const) : ("clone" as const),
    text: m.text,
    ts: m.ts,
  }));
}

export function MomentsExploreChatPage({ contact, onBack }: Props) {
  const peerId = contact.contactUserId;
  const [messages, setMessages] = useState<ChatLocalMessage[]>(() => getMomentsExploreMessages(peerId));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const scRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    queueMicrotask(() => setMessages(getMomentsExploreMessages(peerId)));
  }, [peerId]);

  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    const mine: ChatLocalMessage = { id: nextId(), from: "me", text, ts: Date.now() };
    appendMomentsExploreMessages(peerId, mine);
    const afterMine = [...messagesRef.current, mine];
    setMessages(afterMine);
    setInput("");
    setSending(true);
    setErr("");

    try {
      const { reply } = await momentsExploreReplyApi(peerId, text, toExploreHistory(afterMine));
      const clone: ChatLocalMessage = {
        id: nextId(),
        from: "other",
        text: reply.trim() || MOMENTS_EXPLORE_FALLBACK_REPLY,
        ts: Date.now(),
      };
      appendMomentsExploreMessages(peerId, clone);
      setMessages(getMomentsExploreMessages(peerId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      const clone: ChatLocalMessage = {
        id: nextId(),
        from: "other",
        text: /未配置|503|AI/.test(msg) ? MOMENTS_EXPLORE_FALLBACK_REPLY : MOMENTS_EXPLORE_ERROR_REPLY,
        ts: Date.now(),
      };
      appendMomentsExploreMessages(peerId, clone);
      setMessages(getMomentsExploreMessages(peerId));
    } finally {
      setSending(false);
    }
  }

  const name = titleFor(contact);

  return (
    <div className="aichat-shell msg-chat-room msg-mode-oneway moments-explore-chat">
      <header className="aichat-topbar aichat-topbar-flex msg-tab-topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{name}</h1>
          <p style={{ marginTop: 2 }}>探索 · 单向对话</p>
        </div>
        <span style={{ width: 44, flexShrink: 0 }} aria-hidden />
      </header>

      <p className="moments-explore-chat-hint">仅你可见：对方不会收到消息，分身根据 TA 的日常资料由 AI 回复</p>

      {err && (
        <p className="aichat-form-msg err" style={{ padding: "6px 16px", margin: 0, fontSize: 12 }}>
          {err}
        </p>
      )}

      <div ref={scRef} className="msg-chat-scroll">
        {messages.length === 0 ? (
          <p className="aichat-muted-line" style={{ padding: "24px 16px", textAlign: "center" }}>
            发一条消息，和 TA 的分身聊聊 TA 的日常
          </p>
        ) : (
          <ul className="msg-chat-list" aria-label="探索对话">
            {messages.map((m) => (
              <li key={m.id} className={`msg-chat-bubble-wrap msg-chat-bubble-wrap--${m.from}`}>
                <div className={`msg-chat-bubble msg-chat-bubble--${m.from}`}>
                  <p className="msg-chat-bubble-text">{m.text}</p>
                </div>
              </li>
            ))}
            {sending && (
              <li className="msg-chat-bubble-wrap msg-chat-bubble-wrap--other">
                <div className="msg-chat-bubble msg-chat-bubble--other">
                  <p className="msg-chat-bubble-text aichat-muted-line" style={{ margin: 0 }}>
                    分身正在想…
                  </p>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="msg-chat-composer">
        <input
          className="aichat-input"
          placeholder="探索 TA 的日常…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          disabled={sending}
        />
        <button type="button" className="aichat-btn-primary" onClick={() => void onSend()} disabled={sending}>
          {sending ? "…" : "发送"}
        </button>
      </div>
    </div>
  );
}
