import { useCallback, useEffect, useRef, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../../constants/suyanCopy";
import { relationLabel } from "../../constants/relationTypes";
import {
  getNormalChatMessages,
  ingestIncomingRemoteMessage,
  setNormalChatMessages,
} from "../../services/normalChatLocalStorage";
import { getMeApi } from "../../services/api";
import { sendMessageApi } from "../../services/messagesApi";
import type { MolSuggestLastMessage } from "../../services/molSuggestApi";
import { getMyMols, type MolInMyCollection } from "../../services/stageApi";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import type { ContactItem } from "../../types/contact";
import type { ChatLocalMessage } from "../../types/chat";
import type { RemoteMessage } from "../../types/messages";
import { MolSuggestPanel } from "./MolSuggestPanel";
import { AppIcon } from "../../components/AppIcons";
import { ChatComposeBar, MolComposeButton } from "../../components/ChatComposeBar";
import { ContactAvatar } from "../../components/ContactAvatar";
import { ContactRelationSheet } from "../../components/ContactRelationSheet";
import { contactDisplayName } from "../../lib/contactDisplay";
import { pickRecommendedMolId } from "../../lib/contactRelations";
import { getMyAvatarContact } from "../../services/storage";

type Props = {
  contact: ContactItem;
  onBack: () => void;
  onManageMols?: () => void;
};

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

function resolveActiveMol(mols: MolInMyCollection[], contact: ContactItem): MolInMyCollection | null {
  const recId = pickRecommendedMolId(mols, contact.relationType, contact.defaultMolId);
  if (recId) {
    const found = mols.find((m) => m.id === recId);
    if (found) return found;
  }
  return mols[0] ?? null;
}

function MeAvatarMolBadge() {
  const me = getMyAvatarContact();
  const hasPhoto = Boolean(me.avatarUrl?.trim());
  return (
    <div className="msg-chat-c1-me-avatar-wrap">
      {hasPhoto ? (
        <ContactAvatar contact={me} className="msg-chat-c1-avatar msg-chat-c1-avatar--me msg-chat-c1-avatar--photo" alt="" />
      ) : (
        <span className="msg-chat-c1-avatar msg-chat-c1-avatar--me" aria-hidden>
          <AppIcon name="user" className="app-icon app-icon--xs app-icon--mol" />
        </span>
      )}
      <span className="msg-chat-c1-mol-badge" title={SUYAN.name}>
        <AppIcon name="molSpark" className="app-icon app-icon--badge app-icon--brand" />
      </span>
    </div>
  );
}

export function ChatRoomPage({ contact: contactProp, onBack, onManageMols }: Props) {
  const [contact, setContact] = useState(contactProp);
  const peerId = contact.contactUserId;
  const peerTitle = contactDisplayName(contact);
  const peerRelationLabel = relationLabel(contact.relationType);
  const [messages, setMessages] = useState<ChatLocalMessage[]>(() => getNormalChatMessages(peerId));
  const [input, setInput] = useState("");
  const scRef = useRef<HTMLDivElement>(null);
  const [myUserId, setMyUserId] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [molPanelOpen, setMolPanelOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [relationSheetOpen, setRelationSheetOpen] = useState(false);
  const [myMols, setMyMols] = useState<MolInMyCollection[]>([]);
  const [activeMol, setActiveMol] = useState<{ id: string; name: string } | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatLocalMessage[]>(messages);
  const composerRef = useRef<HTMLDivElement>(null);
  const topbarMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getLastMessagesForSuggest = useCallback((): MolSuggestLastMessage[] => {
    return messagesRef.current.map((m) => ({
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
    setContact(contactProp);
  }, [contactProp]);

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
        const m = resolveActiveMol(mols, contact);
        setActiveMol(m ? { id: m.id, name: formatSuyanDisplayName(m.name) } : null);
      })
      .catch(() => {
        if (!cancelled) setActiveMol(null);
      });
    return () => {
      cancelled = true;
    };
  }, [peerId, contact]);

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

  const closeMolPanel = useCallback(() => {
    setMolPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!molPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (composerRef.current?.contains(t)) return;
      closeMolPanel();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [molPanelOpen, closeMolPanel]);

  useEffect(() => {
    if (!chatMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (topbarMenuRef.current?.contains(e.target as Node)) return;
      setChatMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [chatMenuOpen]);

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

  function toggleMolPanel() {
    if (molPanelOpen) {
      closeMolPanel();
      return;
    }
    setMolPanelOpen(true);
  }

  function pickSuggestion(text: string) {
    closeMolPanel();
    setInput("");
    void sendText(text);
  }

  return (
    <div className="aichat-shell msg-chat-room msg-mode-normal msg-chat-c1">
      <header className="msg-chat-c1-topbar">
        <button type="button" className="msg-chat-c1-icon-btn" onClick={onBack} aria-label="返回">
          ‹
        </button>
        <div className="msg-chat-c1-peer">
          <ContactAvatar contact={contact} className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" alt="" />
          <div className="msg-chat-c1-peer-meta">
            <span className="msg-chat-c1-peer-name">{peerTitle}</span>
            <span className="msg-chat-c1-peer-sub">
              {peerRelationLabel ? `${peerRelationLabel} · 在线` : "在线"}
            </span>
          </div>
        </div>
        <div className="msg-chat-c1-topbar-actions" ref={topbarMenuRef}>
          <button
            type="button"
            className="contacts-more-btn"
            aria-expanded={chatMenuOpen}
            aria-label="更多"
            onClick={() => setChatMenuOpen((open) => !open)}
          >
            ···
          </button>
          {chatMenuOpen ? (
            <div className="contacts-menu msg-chat-c1-topbar-menu" role="menu">
              <button
                type="button"
                className="contacts-menu__item"
                role="menuitem"
                onClick={() => {
                  setChatMenuOpen(false);
                  setRelationSheetOpen(true);
                }}
              >
                设置关系
              </button>
            </div>
          ) : null}
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
                  <ContactAvatar contact={contact} className="msg-chat-c1-avatar msg-chat-c1-avatar--peer" alt="" />
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
          </ul>
        ) : (
          <p className="msg-chat-c1-empty msg-chat-c1-empty--load">加载中…</p>
        )}
      </div>

      <div ref={composerRef} className="msg-chat-composer msg-chat-c1-composer msg-chat-c1-dock">
        <MolSuggestPanel
          open={molPanelOpen}
          peerUserId={peerId}
          molId={activeMol?.id ?? null}
          molName={activeMol?.name ?? null}
          relationType={contact.relationType}
          getLastMessages={getLastMessagesForSuggest}
          draftText={input.trim()}
          getDraftText={() => inputRef.current?.value.trim() ?? input.trim()}
          onPick={pickSuggestion}
          onClose={closeMolPanel}
          onSetRelation={() => {
            closeMolPanel();
            setRelationSheetOpen(true);
          }}
          onManageMols={
            onManageMols
              ? () => {
                  closeMolPanel();
                  onManageMols();
                }
              : undefined
          }
        />
        <ChatComposeBar
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSend={() => void onSend()}
          placeholder="输入消息"
          disabled={!myUserId}
          mol={
            <MolComposeButton
              pressed={molPanelOpen}
              disabled={!myUserId}
              onClick={toggleMolPanel}
            />
          }
        />
      </div>

      <ContactRelationSheet
        contact={contact}
        open={relationSheetOpen}
        onClose={() => setRelationSheetOpen(false)}
        onSaved={(next) => {
          setContact(next);
          const m = resolveActiveMol(myMols, next);
          if (m) {
            setActiveMol({ id: m.id, name: formatSuyanDisplayName(m.name) });
          }
        }}
      />
    </div>
  );
}
