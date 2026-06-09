import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNormalChatMessages,
  ingestIncomingRemoteMessage,
  setNormalChatMessages,
} from "../../services/normalChatLocalStorage";
import { getMeApi } from "../../services/api";
import { sendMessageApi } from "../../services/messagesApi";
import type { MolSuggestLastMessage } from "../../services/molSuggestApi";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import type { ContactItem } from "../../types/contact";
import type { ChatLocalMessage } from "../../types/chat";
import type { RemoteMessage } from "../../types/messages";
import { MolSuggestPanel } from "./MolSuggestPanel";

type Props = {
  contact: ContactItem;
  onBack: () => void;
  /** 从 Mol 建议面板前往管理 Mol（如「我的 Mol」） */
  onManageMols?: () => void;
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

function remoteToView(m: RemoteMessage, myUserId: string): ChatLocalMessage {
  return {
    id: `srv-${m.id}`,
    from: m.fromUserId === myUserId ? "me" : "other",
    text: m.text,
    ts: m.ts,
  };
}

export function ChatRoomPage({ contact, onBack, onManageMols }: Props) {
  const peerId = contact.contactUserId;
  const [messages, setMessages] = useState<ChatLocalMessage[]>(() => getNormalChatMessages(peerId));
  const [input, setInput] = useState("");
  const scRef = useRef<HTMLDivElement>(null);
  const [myUserId, setMyUserId] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [molPanelOpen, setMolPanelOpen] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatLocalMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getLastMessagesForSuggest = useCallback((): MolSuggestLastMessage[] => {
    return messagesRef.current.slice(-12).map((m) => ({
      from: m.from === "me" ? ("me" as const) : ("peer" as const),
      text: m.text,
      ts: m.ts,
    }));
  }, []);

  const reload = useCallback(() => {
    const local = getNormalChatMessages(peerId);
    seenIdsRef.current = new Set(local.map((m) => m.id));
    setMessages(local);
  }, [peerId]);

  const persist = useCallback(
    (next: ChatLocalMessage[]) => {
      setNormalChatMessages(peerId, next);
      setMessages(next);
    },
    [peerId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await getMeApi();
        if (!cancelled) setMyUserId(me.userId);
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => reload());
  }, [peerId, reload]);

  useEffect(() => {
    if (!myUserId) return;
    const unsub = wsClient.subscribe((msg: WsServerMessage) => {
      if (msg.type !== "message") return;
      const p = msg.payload;
      const involves =
        (p.fromUserId === myUserId && p.toUserId === peerId) || (p.fromUserId === peerId && p.toUserId === myUserId);
      if (!involves) return;
      ingestIncomingRemoteMessage(myUserId, p);
      reload();
    });
    return unsub;
  }, [myUserId, peerId, reload]);

  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, myUserId, molPanelOpen]);

  const sendText = useCallback(
    async (text: string) => {
      if (!myUserId) return;
      const t = text.trim();
      if (!t) return;
      setLoadErr("");
      try {
        const { message: m } = await sendMessageApi(peerId, t);
        const view = remoteToView(m, myUserId);
        if (!seenIdsRef.current.has(view.id)) {
          seenIdsRef.current.add(view.id);
          persist([...messagesRef.current, view]);
        }
      } catch (e: unknown) {
        setLoadErr(e instanceof Error ? e.message : String(e));
      }
    },
    [myUserId, peerId, persist],
  );

  async function onSend() {
    const text = input.trim();
    if (!text || !myUserId) return;
    setInput("");
    await sendText(text);
  }

  return (
    <div className="aichat-shell msg-chat-room msg-mode-normal">
      <header className="aichat-topbar aichat-topbar-flex msg-tab-topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{titleFor(contact)}</h1>
        </div>
        <span style={{ width: 44, flexShrink: 0 }} aria-hidden />
      </header>

      {loadErr && (
        <p className="aichat-form-msg err" style={{ padding: "8px 16px", margin: 0 }}>
          {loadErr}
        </p>
      )}

      <div ref={scRef} className="msg-chat-scroll">
        {myUserId ? (
          <ul className="msg-chat-list" aria-label="消息记录">
            {messages.length === 0 ? (
              <li className="msg-chat-list-empty-hint">
                <p className="aichat-muted-line" style={{ margin: "24px 16px", textAlign: "center" }}>
                  暂无记录，发送第一条消息
                </p>
              </li>
            ) : null}
            {messages.map((m) => (
              <li key={m.id} className={`msg-chat-bubble-wrap msg-chat-bubble-wrap--${m.from}`}>
                <div className={`msg-chat-bubble msg-chat-bubble--${m.from}`}>
                  <p className="msg-chat-bubble-text">{m.text}</p>
                </div>
              </li>
            ))}
            <li className="msg-chat-bubble-wrap msg-chat-bubble-wrap--me msg-mol-placeholder-wrap">
              <button
                type="button"
                className={`msg-mol-placeholder-bubble${molPanelOpen ? " msg-mol-placeholder-bubble--open" : ""}`}
                onClick={() => setMolPanelOpen(true)}
                aria-label="Mol 建议回复"
              >
                Mol
              </button>
            </li>
          </ul>
        ) : (
          <p className="aichat-muted-line" style={{ padding: "24px 16px", textAlign: "center" }}>
            加载中…
          </p>
        )}
      </div>

      {myUserId ? (
        <MolSuggestPanel
          open={molPanelOpen}
          peerUserId={peerId}
          getLastMessages={getLastMessagesForSuggest}
          onClose={() => setMolPanelOpen(false)}
          onAdopt={(text) => {
            setMolPanelOpen(false);
            void sendText(text);
          }}
          onManageMols={
            onManageMols
              ? () => {
                  setMolPanelOpen(false);
                  onManageMols();
                }
              : undefined
          }
        />
      ) : null}

      <div className="msg-chat-composer">
        <input
          className="aichat-input"
          placeholder="输入消息"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          disabled={!myUserId}
        />
        <button type="button" className="aichat-btn-primary" onClick={() => void onSend()} disabled={!myUserId}>
          发送
        </button>
      </div>
    </div>
  );
}
