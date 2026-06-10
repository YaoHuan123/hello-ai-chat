import { useEffect, useRef, useState } from "react";
import {
  appendMomentsExploreMessages,
  getMomentsExploreMessages,
} from "../../services/momentsExploreChatLocalStorage";
import { momentsExploreReplyApi, type ExploreChatLine } from "../../services/momentsApi";
import type { ContactItem } from "../../types/contact";
import type { ChatLocalMessage } from "../../types/chat";
import { MOMENTS_EXPLORE_ERROR_REPLY, MOMENTS_EXPLORE_FALLBACK_REPLY } from "../../types/momentsExplore";
import { contactDisplayName } from "../../lib/contactDisplay";
import { ContactAvatar } from "../../components/ContactAvatar";
import { AppIcon } from "../../components/AppIcons";
import { getMyAvatarContact } from "../../services/storage";

type Props = {
  contact: ContactItem;
  onBack: () => void;
};

function nextId(): string {
  return `mex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function toExploreHistory(messages: ChatLocalMessage[]): ExploreChatLine[] {
  return messages.map((m) => ({
    from: m.from === "me" ? ("explorer" as const) : ("clone" as const),
    text: m.text,
    ts: m.ts,
  }));
}

function MeAvatar() {
  const me = getMyAvatarContact();
  const hasPhoto = Boolean(me.avatarUrl?.trim());
  if (hasPhoto) {
    return <ContactAvatar contact={me} className="msg-chat-c1-avatar msg-chat-c1-avatar--me msg-chat-c1-avatar--photo" alt="" />;
  }
  return (
    <span className="msg-chat-c1-avatar msg-chat-c1-avatar--me" aria-hidden>
      <AppIcon name="user" className="app-icon app-icon--xs app-icon--mol" />
    </span>
  );
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

  const name = contactDisplayName(contact);

  return (
    <div className="aichat-shell msg-chat-room msg-mode-oneway msg-chat-c1 moments-explore-chat">
      <header className="msg-chat-c1-topbar">
        <button type="button" className="msg-chat-c1-icon-btn" onClick={onBack} aria-label="返回">
          ‹
        </button>
        <div className="msg-chat-c1-peer">
          <ContactAvatar contact={contact} className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" alt="" />
          <div className="msg-chat-c1-peer-meta">
            <span className="msg-chat-c1-peer-name">{name}</span>
          </div>
        </div>
      </header>

      {err ? <p className="aichat-form-msg err msg-chat-c1-banner-err">{err}</p> : null}

      <div ref={scRef} className="msg-chat-scroll msg-chat-c1-scroll">
        {messages.length === 0 && !sending ? (
          <p className="msg-chat-c1-empty">发一条消息，和 TA 的分身聊聊 TA 的日常</p>
        ) : (
          <ul className="msg-chat-list msg-chat-c1-list" aria-label="探索对话">
            {messages.map((m) => (
              <li key={m.id} className={`msg-chat-c1-row msg-chat-c1-row--${m.from === "me" ? "me" : "other"}`}>
                {m.from === "other" ? (
                  <ContactAvatar contact={contact} className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" alt="" />
                ) : (
                  <MeAvatar />
                )}
                <div className="msg-chat-c1-col">
                  <div className={`msg-chat-c1-bubble msg-chat-c1-bubble--${m.from === "me" ? "me" : "other"}`}>
                    {m.text}
                  </div>
                  <span className="msg-chat-c1-meta">{formatMessageTime(m.ts)}</span>
                </div>
              </li>
            ))}
            {sending ? (
              <li className="msg-chat-c1-row msg-chat-c1-row--other">
                <ContactAvatar contact={contact} className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" alt="" />
                <div className="msg-chat-c1-col">
                  <div className="msg-chat-c1-bubble msg-chat-c1-bubble--other">
                    <span className="aichat-muted-line">分身正在想…</span>
                  </div>
                </div>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="msg-chat-composer msg-chat-c1-composer">
        <input
          className="msg-chat-c1-input"
          placeholder="探索 TA 的日常…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          disabled={sending}
        />
        <button type="button" className="msg-chat-c1-send" onClick={() => void onSend()} disabled={sending}>
          发送
        </button>
      </div>
    </div>
  );
}
