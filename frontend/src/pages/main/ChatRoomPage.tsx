import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNormalChatMessages,
  ingestIncomingRemoteMessage,
  setNormalChatMessages,
} from "../../services/normalChatLocalStorage";
import { getMeApi } from "../../services/api";
import { sendMessageApi } from "../../services/messagesApi";
import type { MolSuggestLastMessage } from "../../services/molSuggestApi";
import { getChatActiveMolId, setChatActiveMolId } from "../../services/chatMolLocalStorage";
import { getMyMols, type MolInMyCollection } from "../../services/stageApi";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import type { ContactItem } from "../../types/contact";
import type { ChatLocalMessage } from "../../types/chat";
import type { RemoteMessage } from "../../types/messages";
import { MolSuggestPanel } from "./MolSuggestPanel";
import { ChatMolSwitchModal } from "./ChatMolSwitchModal";

type Props = {
  contact: ContactItem;
  onBack: () => void;
  onOpenMolDetail?: (molId: string) => void;
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

function initialChar(label: string): string {
  const t = label.trim();
  return t.slice(0, 1) || "?";
}

function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function remoteToView(m: RemoteMessage, myUserId: string): ChatLocalMessage {
  return {
    id: `srv-${m.id}`,
    from: m.fromUserId === myUserId ? "me" : "other",
    text: m.text,
    ts: m.ts,
  };
}

function resolveActiveMol(mols: MolInMyCollection[], peerUserId: string): MolInMyCollection | null {
  const stored = getChatActiveMolId(peerUserId);
  if (stored) {
    const found = mols.find((m) => m.id === stored);
    if (found) return found;
  }
  const first = mols[0] ?? null;
  if (first) setChatActiveMolId(peerUserId, first.id);
  return first;
}

function MeAvatarMolBadge() {
  return (
    <div className="msg-chat-c1-me-avatar-wrap">
      <span className="msg-chat-c1-avatar msg-chat-c1-avatar--me" aria-hidden>
        我
      </span>
      <span className="msg-chat-c1-mol-badge" title="Mol">
        M
      </span>
    </div>
  );
}

export function ChatRoomPage({ contact, onBack, onOpenMolDetail, onManageMols }: Props) {
  const peerId = contact.contactUserId;
  const peerTitle = titleFor(contact);
  const peerInitial = initialChar(peerTitle);
  const [messages, setMessages] = useState<ChatLocalMessage[]>(() => getNormalChatMessages(peerId));
  const [input, setInput] = useState("");
  const scRef = useRef<HTMLDivElement>(null);
  const [myUserId, setMyUserId] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [molPanelOpen, setMolPanelOpen] = useState(false);
  const [molSwitchOpen, setMolSwitchOpen] = useState(false);
  const [myMols, setMyMols] = useState<MolInMyCollection[]>([]);
  const [activeMol, setActiveMol] = useState<{ id: string; name: string } | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatLocalMessage[]>(messages);
  const molPanelRef = useRef<HTMLLIElement>(null);

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
    let cancelled = false;
    void getMyMols()
      .then((mols) => {
        if (cancelled) return;
        setMyMols(mols);
        const m = resolveActiveMol(mols, peerId);
        setActiveMol(m ? { id: m.id, name: m.name } : null);
      })
      .catch(() => {
        if (!cancelled) setActiveMol(null);
      });
    return () => {
      cancelled = true;
    };
  }, [peerId]);

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

  useEffect(() => {
    if (!molPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (molPanelRef.current?.contains(t)) return;
      if (molSwitchOpen) return;
      setMolPanelOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [molPanelOpen, molSwitchOpen]);

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

  function selectChatMol(molId: string) {
    const m = myMols.find((x) => x.id === molId);
    if (!m) return;
    setChatActiveMolId(peerId, molId);
    setActiveMol({ id: m.id, name: m.name });
  }

  function openMolSwitch() {
    if (myMols.length > 0) setMolSwitchOpen(true);
    else onManageMols?.();
  }

  return (
    <div className="aichat-shell msg-chat-room msg-mode-normal msg-chat-c1">
      <header className="msg-chat-c1-topbar">
        <button type="button" className="msg-chat-c1-icon-btn" onClick={onBack} aria-label="返回">
          ‹
        </button>
        <div className="msg-chat-c1-peer">
          <span className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" aria-hidden>
            {peerInitial}
          </span>
          <div className="msg-chat-c1-peer-meta">
            <span className="msg-chat-c1-peer-name">{peerTitle}</span>
            <span className="msg-chat-c1-peer-sub">在线</span>
          </div>
        </div>
      </header>

      {loadErr ? (
        <p className="aichat-form-msg err msg-chat-c1-banner-err">{loadErr}</p>
      ) : null}

      <div ref={scRef} className="msg-chat-scroll msg-chat-c1-scroll">
        {myUserId ? (
          <ul className="msg-chat-list msg-chat-c1-list" aria-label="消息记录">
            {messages.length === 0 ? (
              <li className="msg-chat-list-empty-hint">
                <p className="msg-chat-c1-empty">暂无记录，发送第一条消息</p>
              </li>
            ) : null}
            {messages.map((m) => (
              <li key={m.id} className={`msg-chat-c1-row msg-chat-c1-row--${m.from === "me" ? "me" : "other"}`}>
                {m.from === "other" ? (
                  <span className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" aria-hidden>
                    {peerInitial}
                  </span>
                ) : (
                  <MeAvatarMolBadge />
                )}
                <div className="msg-chat-c1-col">
                  <div className={`msg-chat-c1-bubble msg-chat-c1-bubble--${m.from === "me" ? "me" : "other"}`}>
                    {m.text}
                  </div>
                  <span className="msg-chat-c1-meta">{formatMessageTime(m.ts)}</span>
                </div>
              </li>
            ))}
            <li
              ref={molPanelRef}
              className={`msg-chat-c1-row msg-chat-c1-row--me msg-chat-c1-mol-row${molPanelOpen ? " msg-chat-c1-mol-row--open" : ""}`}
            >
              <MeAvatarMolBadge />
              {molPanelOpen && activeMol ? (
                <MolSuggestPanel
                  open={molPanelOpen}
                  peerUserId={peerId}
                  molId={activeMol.id}
                  molName={activeMol.name}
                  getLastMessages={getLastMessagesForSuggest}
                  onAdopt={(text) => {
                    setMolPanelOpen(false);
                    void sendText(text);
                  }}
                  onSwitchMol={openMolSwitch}
                />
              ) : (
                <button
                  type="button"
                  className="msg-chat-c1-placeholder"
                  onClick={() => {
                    if (activeMol) setMolPanelOpen(true);
                    else onManageMols?.();
                  }}
                  aria-label={activeMol ? "让 Mol 帮你想 3 条回复" : "添加 Mol"}
                >
                  {activeMol ? (
                    <>
                      <span className="msg-chat-c1-placeholder__spark" aria-hidden>
                        ✨
                      </span>
                      <span>让 Mol 帮我想 3 条回复</span>
                    </>
                  ) : (
                    <span>添加 Mol 后再使用建议</span>
                  )}
                </button>
              )}
            </li>
          </ul>
        ) : (
          <p className="msg-chat-c1-empty msg-chat-c1-empty--load">加载中…</p>
        )}
      </div>

      <div className="msg-chat-composer msg-chat-c1-composer">
        <input
          className="msg-chat-c1-input"
          placeholder="输入消息"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          disabled={!myUserId}
        />
        <button type="button" className="msg-chat-c1-send" onClick={() => void onSend()} disabled={!myUserId}>
          发送
        </button>
      </div>

      {molSwitchOpen && myMols.length > 0 ? (
        <ChatMolSwitchModal
          key={`${activeMol?.id ?? "none"}-${myMols.length}`}
          mols={myMols}
          currentId={activeMol?.id ?? myMols[0]?.id ?? ""}
          onClose={() => setMolSwitchOpen(false)}
          onConfirm={(id) => {
            selectChatMol(id);
            if (!molPanelOpen) setMolPanelOpen(true);
          }}
          onEditMol={
            onOpenMolDetail
              ? (id) => {
                  setMolSwitchOpen(false);
                  setMolPanelOpen(false);
                  onOpenMolDetail(id);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
