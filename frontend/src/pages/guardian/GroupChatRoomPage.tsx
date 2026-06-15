import { useEffect, useMemo, useRef, useState } from "react";
import { getMeApi, listContactsApi } from "../../services/api";
import {
  getGuardianGroupApi,
  listGuardianOwnerHintsApi,
  listGuardianRolesApi,
  sendGuardianGroupMessageApi,
} from "../../services/guardianApi";
import { GuardianGroupMembersPanel } from "./GuardianGroupMembersPanel";
import {
  getGuardianGroupMessages,
  setGuardianGroupMessages,
} from "../../services/guardianGroupLocalStorage";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import type { ContactItem } from "../../types/contact";
import type { GuardianGroup, GuardianGroupMessage, GuardianOwnerHint, GuardianRole } from "../../types/guardian";
import { GUARDIAN_RISK_LABEL } from "../../types/guardian";
import { ChatComposeBar } from "../../components/ChatComposeBar";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { ContactAvatar } from "../../components/ContactAvatar";
import { contactDisplayName, maskPhoneDisplay } from "../../lib/contactDisplay";
import { getMyAvatarContact } from "../../services/storage";
import { useChatViewportScroll } from "../../hooks/useChatViewportScroll";

type Props = {
  groupId: string;
  onBack: () => void;
};

function displayFromContact(c: ContactItem | undefined, phone: string): string {
  if (c) return contactDisplayName(c);
  return maskPhoneDisplay(phone);
}

type BubbleKind = "me" | "peer" | "guardian";

function bubbleKind(m: GuardianGroupMessage, myUserId: string): BubbleKind {
  if (m.senderKind === "guardian") return "guardian";
  if (m.fromUserId === myUserId) return "me";
  return "peer";
}

function formatMessageTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function contactForMember(
  contactById: Map<string, ContactItem>,
  userId: string,
  phone: string,
): ContactItem {
  const found = contactById.get(userId);
  if (found) return found;
  return {
    contactUserId: userId,
    phone,
    remark: null,
    nickname: null,
    avatarUrl: null,
    avatarUpdatedAt: null,
    relationType: null,
    defaultMolId: null,
    createdAt: 0,
  };
}

function MeMessageAvatar() {
  const me = getMyAvatarContact();
  const hasPhoto = Boolean(me.avatarUrl?.trim());
  return (
    <ContactAvatar
      contact={me}
      className={`msg-chat-c1-avatar msg-chat-c1-avatar--me${hasPhoto ? " msg-chat-c1-avatar--photo" : ""}`}
      alt=""
    />
  );
}

export function GroupChatRoomPage({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<GuardianGroup | null>(null);
  const [roles, setRoles] = useState<Map<string, GuardianRole>>(new Map());
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [messages, setMessages] = useState<GuardianGroupMessage[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [input, setInput] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [sending, setSending] = useState(false);
  const [latestHint, setLatestHint] = useState<GuardianOwnerHint | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const scRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const messagesRef = useRef<GuardianGroupMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.contactUserId, c])), [contacts]);

  const memberDisplayName = (userId: string, phone: string): string => {
    if (userId === myUserId) return "我";
    return displayFromContact(contactById.get(userId), phone);
  };

  const persistMessages = (next: GuardianGroupMessage[]) => {
    setGuardianGroupMessages(groupId, next);
    setMessages(next);
  };

  const appendMessages = (...items: GuardianGroupMessage[]) => {
    const next = [...messagesRef.current, ...items];
    persistMessages(next);
    for (const it of items) {
      seenIdsRef.current.add(it.id);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadErr("");
      try {
        const localMsgs = getGuardianGroupMessages(groupId);
        const [me, { group: g }, { items: rs }, { items: cs }] = await Promise.all([
          getMeApi(),
          getGuardianGroupApi(groupId),
          listGuardianRolesApi(),
          listContactsApi(),
        ]);
        if (cancelled) return;
        setMyUserId(me.userId);
        setGroup(g);
        setContacts(cs);
        setRoles(new Map(rs.map((r) => [r.id, r])));
        seenIdsRef.current = new Set(localMsgs.map((x) => x.id));
        setMessages(localMsgs);
        if (g.protectedUserId === me.userId) {
          try {
            const { items: hints } = await listGuardianOwnerHintsApi(groupId);
            if (!cancelled && hints.length > 0) {
              setLatestHint(hints[0] ?? null);
            }
          } catch {
            /* 非群主或暂无提示 */
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    const unsub = wsClient.subscribe((msg: WsServerMessage) => {
      if (msg.type === "guardian_group_message") {
        if (msg.payload.groupId !== groupId) return;
        const m = msg.payload.message as GuardianGroupMessage;
        if (seenIdsRef.current.has(m.id)) return;
        appendMessages({ ...(m as GuardianGroupMessage), groupId });
        return;
      }
      if (msg.type === "guardian_owner_hint") {
        if (msg.payload.groupId !== groupId) return;
        setLatestHint(msg.payload.hint as GuardianOwnerHint);
        return;
      }
      if (msg.type === "guardian_group_updated") {
        if (msg.payload.groupId !== groupId) return;
        setGroup(msg.payload.group as GuardianGroup);
      }
    });
    return unsub;
  }, [groupId]);

  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useChatViewportScroll(scRef);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setLoadErr("");
    setInput("");
    try {
      const { message: m } = await sendGuardianGroupMessageApi(groupId, text, messagesRef.current);
      if (!seenIdsRef.current.has(m.id)) {
        appendMessages(m);
      }
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  const isProtected = group && myUserId === group.protectedUserId;
  const isOwner = isProtected;
  const humanMembers = group?.members ?? [];
  const otherHumanCount = humanMembers.filter((m) => m.userId !== myUserId).length;
  const showPeerSender = otherHumanCount > 1;
  const title =
    group?.name?.trim() ||
    (humanMembers.length > 0 ? `群聊(${humanMembers.length})` : "群聊");

  if (membersOpen && group) {
    return (
      <GuardianGroupMembersPanel
        groupId={groupId}
        group={group}
        roles={roles}
        contacts={contacts}
        myUserId={myUserId}
        isOwner={Boolean(isOwner)}
        onBack={() => setMembersOpen(false)}
        onGroupUpdated={setGroup}
      />
    );
  }

  return (
    <div className="aichat-shell msg-chat-room msg-chat-c1 msg-mode-normal guardian-group-room guardian-group-room--simple">
      <header className="msg-chat-c1-topbar">
        <button type="button" className="msg-chat-c1-icon-btn" onClick={onBack} aria-label="返回">
          ‹
        </button>
        <div className="msg-chat-c1-peer msg-chat-c1-peer--title-only">
          <div className="msg-chat-c1-peer-meta">
            <span className="msg-chat-c1-peer-name">{title}</span>
          </div>
        </div>
        <div className="msg-chat-c1-topbar-actions">
          <button
            type="button"
            className="contacts-more-btn"
            aria-label="群成员"
            onClick={() => setMembersOpen(true)}
          >
            ···
          </button>
        </div>
      </header>

      {loadErr ? <p className="aichat-form-msg err msg-chat-c1-banner-err">{loadErr}</p> : null}

      {isProtected && latestHint ? (
        <div className={`guardian-risk-bar guardian-risk-bar--${latestHint.level}`} role="status">
          <span className="guardian-risk-bar__badge">{GUARDIAN_RISK_LABEL[latestHint.level]}</span>
          <div className="guardian-risk-bar__body">
            <strong>{latestHint.label}</strong>
            <span>{latestHint.hint}</span>
          </div>
          <button type="button" className="guardian-risk-bar__dismiss" onClick={() => setLatestHint(null)} aria-label="收起提示">
            ×
          </button>
        </div>
      ) : null}

      <div ref={scRef} className="msg-chat-scroll msg-chat-c1-scroll">
        {messages.length === 0 ? (
          <p className="msg-chat-c1-empty">暂无消息</p>
        ) : (
          <ul className="msg-chat-list msg-chat-c1-list" aria-label="群消息">
            {messages.map((m) => {
              const kind = myUserId ? bubbleKind(m, myUserId) : "peer";
              const role = m.guardianRoleId ? roles.get(m.guardianRoleId) : undefined;
              const member = humanMembers.find((x) => x.userId === m.fromUserId);
              const isMe = kind === "me";
              const senderLabel =
                kind === "guardian"
                  ? (role?.name ?? "搭子")
                  : kind === "peer" && showPeerSender && member
                    ? memberDisplayName(member.userId, member.phone)
                    : null;

              return (
                <li
                  key={m.id}
                  className={`msg-chat-c1-row${isMe ? " msg-chat-c1-row--me" : ""}`}
                >
                  {kind === "guardian" && role ? (
                    <GuardianAvatar role={role} className="msg-chat-c1-avatar msg-chat-c1-avatar--guardian" alt="" />
                  ) : isMe ? (
                    <MeMessageAvatar />
                  ) : member ? (
                    <ContactAvatar
                      contact={contactForMember(contactById, member.userId, member.phone)}
                      className="msg-chat-c1-avatar msg-chat-c1-avatar--peer msg-chat-c1-avatar--photo"
                      alt=""
                    />
                  ) : null}
                  <div className="msg-chat-c1-col">
                    {senderLabel ? <span className="guardian-group-msg-name">{senderLabel}</span> : null}
                    <div className={`msg-chat-c1-bubble msg-chat-c1-bubble--${isMe ? "me" : "other"}`}>{m.text}</div>
                    <span className="msg-chat-c1-meta">{formatMessageTime(m.ts)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="msg-chat-composer msg-chat-c1-composer msg-chat-c1-dock">
        <ChatComposeBar
          value={input}
          onChange={setInput}
          onSend={() => void onSend()}
          placeholder="输入消息"
          sendDisabled={sending}
        />
      </div>
    </div>
  );
}
