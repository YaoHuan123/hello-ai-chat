import { useCallback, useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { listNormalConversationPreviews } from "../../services/normalChatLocalStorage";
import { listGuardianGroupsApi } from "../../services/guardianApi";
import { getGuardianGroupLastPreviewInfo } from "../../services/guardianGroupLocalStorage";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import { AppIcon } from "../../components/AppIcons";
import type { GuardianGroupListItem } from "../../types/guardian";
import { ContactAvatar } from "../../components/ContactAvatar";
import { contactDisplayName } from "../../lib/contactDisplay";
import type { ContactItem } from "../../types/contact";

type Props = {
  onOpenChatRoom: (c: ContactItem) => void;
  onOpenGuardianGroup: (groupId: string) => void;
};

type ConvRow =
  | {
      kind: "guardian";
      key: string;
      lastTs: number;
      lastText: string;
      group: GuardianGroupListItem;
    }
  | {
      kind: "normal";
      key: string;
      lastTs: number;
      lastText: string;
      contact: ContactItem;
    };

function formatConvTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfTarget) / 86400000);

  if (dayDiff === 0) {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) return "昨天";
  if (dayDiff < 7) {
    return d.toLocaleDateString("zh-CN", { weekday: "short" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" });
}

function guardianGroupTitle(g: GuardianGroupListItem): string {
  const name = g.name?.trim();
  if (name) return name;
  const count = g.memberCount ?? g.members?.length ?? 2;
  return `搭子群 · ${count}人`;
}

export function MessagesTab({ onOpenChatRoom, onOpenGuardianGroup }: Props) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [localConvPeers, setLocalConvPeers] = useState<{ peerUserId: string; lastText: string; lastTs: number }[]>([]);
  const [guardianGroups, setGuardianGroups] = useState<GuardianGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      setLoading(true);
      setErr("");
      try {
        const [{ items: cs }, { items: gs }] = await Promise.all([listContactsApi(), listGuardianGroupsApi()]);
        const previews = listNormalConversationPreviews(cs.map((c) => c.contactUserId));
        if (!cancelled) setLocalConvPeers(previews);
        if (!cancelled) setGuardianGroups(gs);
        if (!cancelled) setContacts(cs);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = wsClient.subscribe((msg: WsServerMessage) => {
      if (msg.type === "message" || msg.type === "guardian_group_message") {
        load();
      }
    });
    return unsub;
  }, [load]);

  useEffect(() => {
    return load();
  }, [load]);

  const convRows = useMemo((): ConvRow[] => {
    const rows: ConvRow[] = [];

    for (const g of guardianGroups) {
      const local = getGuardianGroupLastPreviewInfo(g.id);
      const lastText = local?.text || g.lastText.trim() || "暂无消息";
      const lastTs = local?.ts || g.lastTs || g.createdAt;
      rows.push({
        kind: "guardian",
        key: `guardian-${g.id}`,
        lastTs,
        lastText,
        group: g,
      });
    }

    for (const c of localConvPeers) {
      const contact = contacts.find((x) => x.contactUserId === c.peerUserId) ?? {
        contactUserId: c.peerUserId,
        phone: c.peerUserId,
        remark: null,
        nickname: null,
        avatarUrl: null,
        avatarUpdatedAt: null,
        createdAt: c.lastTs,
      };
      rows.push({
        kind: "normal",
        key: c.peerUserId,
        lastTs: c.lastTs,
        lastText: c.lastText.trim() || "暂无消息",
        contact,
      });
    }

    rows.sort((a, b) => b.lastTs - a.lastTs);
    return rows;
  }, [contacts, guardianGroups, localConvPeers]);

  return (
    <div className="msg-tab-inner">
      <header className="aichat-topbar msg-tab-topbar aichat-topbar--plain">
        <h1>消息</h1>
      </header>

      <div className="aichat-main msg-tab-main">
        {err && <p className="aichat-form-msg err">{err}</p>}
        {loading ? (
          <ul className="msg-conv-list msg-conv-list--skeleton" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <div className="msg-conv-row msg-conv-row--skeleton">
                  <span className="msg-conv-avatar msg-conv-skeleton-block" />
                  <span className="msg-conv-body">
                    <span className="msg-conv-head">
                      <span className="msg-conv-skeleton-line msg-conv-skeleton-line--title" />
                      <span className="msg-conv-skeleton-line msg-conv-skeleton-line--time" />
                    </span>
                    <span className="msg-conv-skeleton-line msg-conv-skeleton-line--preview" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : convRows.length === 0 ? (
          <div className="msg-conv-empty">
            <p className="msg-conv-empty__title">暂无会话</p>
          </div>
        ) : (
          <ul className="msg-conv-list" aria-label="会话列表">
            {convRows.map((row) =>
              row.kind === "guardian" ? (
                <li key={row.key}>
                  <button
                    type="button"
                    className="msg-conv-row msg-conv-row--guardian"
                    onClick={() => onOpenGuardianGroup(row.group.id)}
                  >
                    <span className="msg-conv-avatar msg-conv-avatar--guardian" aria-hidden>
                      <AppIcon name="usersGroup" className="app-icon app-icon--md app-icon--guardian" />
                    </span>
                    <span className="msg-conv-body">
                      <span className="msg-conv-head">
                        <span className="msg-conv-title">
                          {guardianGroupTitle(row.group)}
                          <span className="msg-conv-scene-tag">{row.group.scene}</span>
                        </span>
                        <span className="msg-conv-time">{formatConvTime(row.lastTs)}</span>
                      </span>
                      <span className="msg-conv-preview">
                        {row.group.memberPreview ? `${row.group.memberPreview} · ` : ""}
                        {row.lastText}
                      </span>
                    </span>
                  </button>
                </li>
              ) : (
                <li key={row.key}>
                  <button type="button" className="msg-conv-row" onClick={() => onOpenChatRoom(row.contact)}>
                    <ContactAvatar contact={row.contact} className="msg-conv-avatar msg-conv-avatar--user" />
                    <span className="msg-conv-body">
                      <span className="msg-conv-head">
                        <span className="msg-conv-title">{contactDisplayName(row.contact)}</span>
                        <span className="msg-conv-time">{formatConvTime(row.lastTs)}</span>
                      </span>
                      <span className="msg-conv-preview">{row.lastText}</span>
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
