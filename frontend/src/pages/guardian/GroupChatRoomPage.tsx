import { useEffect, useMemo, useRef, useState } from "react";
import { getMeApi, listContactsApi } from "../../services/api";
import {
  getGuardianGroupApi,
  listGuardianOwnerHintsApi,
  listGuardianRolesApi,
  sendGuardianGroupMessageApi,
} from "../../services/guardianApi";
import {
  getGuardianGroupMessages,
  setGuardianGroupMessages,
} from "../../services/guardianGroupLocalStorage";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import type { ContactItem } from "../../types/contact";
import type { GuardianGroup, GuardianGroupMessage, GuardianOwnerHint, GuardianRole } from "../../types/guardian";
import { GUARDIAN_RISK_LABEL } from "../../types/guardian";
import { GuardianAvatar } from "../../components/GuardianAvatar";
import { contactDisplayName, maskPhoneDisplay } from "../../lib/contactDisplay";

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

export function GroupChatRoomPage({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<GuardianGroup | null>(null);
  const [roles, setRoles] = useState<Map<string, GuardianRole>>(new Map());
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [messages, setMessages] = useState<GuardianGroupMessage[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [input, setInput] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [sending, setSending] = useState(false);
  const [ownerHints, setOwnerHints] = useState<GuardianOwnerHint[]>([]);
  const [latestHint, setLatestHint] = useState<GuardianOwnerHint | null>(null);
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

  const mergeHint = (hint: GuardianOwnerHint) => {
    setOwnerHints((prev) => {
      const next = prev.filter((h) => h.peerMessageId !== hint.peerMessageId);
      return [hint, ...next].slice(0, 30);
    });
    setLatestHint(hint);
  };

  const hintByPeerMsgId = new Map(ownerHints.map((h) => [h.peerMessageId, h]));

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
              setOwnerHints(hints);
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
        mergeHint(msg.payload.hint as GuardianOwnerHint);
      }
    });
    return unsub;
  }, [groupId]);

  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
  const humanMembers = group?.members ?? [];
  const title =
    group?.name?.trim() ||
    (humanMembers.length > 0 ? `群聊(${humanMembers.length})` : "群聊");
  const guardianNames = group?.guardianRoleIds.map((id) => roles.get(id)?.name ?? "AI").join("、") ?? "";

  return (
    <div className="aichat-shell msg-chat-room guardian-group-room">
      <header className="aichat-topbar aichat-topbar-flex msg-tab-topbar">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head" style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{title}</h1>
          <p style={{ marginTop: 2 }}>
            {group?.scene ?? "…"} · {humanMembers.length} 人
            {guardianNames ? ` · ${guardianNames}` : ""}
          </p>
        </div>
        <span style={{ width: 44, flexShrink: 0 }} aria-hidden />
      </header>

      {group && (
        <div className="guardian-group-members" aria-label="群成员">
          {humanMembers.map((m) => {
            const label =
              m.userId === group.protectedUserId
                ? `${memberDisplayName(m.userId, m.phone)}（群主）`
                : memberDisplayName(m.userId, m.phone);
            return (
              <span key={m.userId} className="guardian-group-members__chip guardian-group-members__chip--human">
                {label}
              </span>
            );
          })}
          {group.guardianRoleIds.map((id) => {
            const r = roles.get(id);
            return (
              <span
                key={id}
                className="guardian-group-members__chip guardian-group-members__chip--ai"
                style={{ borderColor: r?.avatarColor }}
              >
                {r ? <GuardianAvatar role={r} className="guardian-group-members__av" alt="" /> : null}
                {r?.name ?? "AI"}
              </span>
            );
          })}
        </div>
      )}

      {guardianNames && (
        <p className="guardian-group-hint">搭子可主动参与聊天、轮流接话</p>
      )}

      {isProtected && latestHint && (
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
      )}

      {isProtected && !latestHint && (
        <p className="guardian-owner-only-hint">仅你可见：敏感话题会显示提醒</p>
      )}

      {loadErr && (
        <p className="aichat-form-msg err" style={{ padding: "8px 16px", margin: 0 }}>
          {loadErr}
        </p>
      )}

      <div ref={scRef} className="msg-chat-scroll">
        {messages.length === 0 ? (
          <p className="aichat-muted-line" style={{ padding: "24px 16px", textAlign: "center" }}>
            暂无消息，发送第一条开始
          </p>
        ) : (
          <ul className="msg-chat-list" aria-label="群消息">
            {messages.map((m) => {
              const kind = myUserId ? bubbleKind(m, myUserId) : "peer";
              const role = m.guardianRoleId ? roles.get(m.guardianRoleId) : undefined;
              const member = humanMembers.find((x) => x.userId === m.fromUserId);
              const senderLabel =
                kind === "guardian"
                  ? role?.name ?? "AI"
                  : kind === "peer" && member
                    ? memberDisplayName(member.userId, member.phone)
                    : null;
              return (
                <li
                  key={m.id}
                  className={`msg-chat-bubble-wrap msg-chat-bubble-wrap--${kind === "guardian" ? "guardian" : kind}`}
                >
                  {senderLabel && (
                    <span
                      className="guardian-bubble-label"
                      style={kind === "guardian" && role ? { color: role.avatarColor } : undefined}
                    >
                      {senderLabel}
                    </span>
                  )}
                  <div
                    className={`msg-chat-bubble msg-chat-bubble--${kind === "guardian" ? "guardian" : kind}`}
                    style={kind === "guardian" && role ? { borderColor: role.avatarColor } : undefined}
                  >
                    <p className="msg-chat-bubble-text">{m.text}</p>
                  </div>
                  {isProtected &&
                    kind === "peer" &&
                    (() => {
                      const h = hintByPeerMsgId.get(m.id);
                      if (!h) return null;
                      return (
                        <div className={`guardian-inline-risk guardian-inline-risk--${h.level}`}>
                          <span className="guardian-inline-risk__label">{h.label}</span>
                          <span className="guardian-inline-risk__text">{h.hint}</span>
                        </div>
                      );
                    })()}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="msg-chat-composer">
        <input
          className="aichat-input"
          placeholder="输入消息"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
        />
        <button type="button" className="aichat-btn-primary" onClick={() => void onSend()} disabled={sending}>
          发送
        </button>
      </div>
    </div>
  );
}
