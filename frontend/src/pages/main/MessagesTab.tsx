import { useCallback, useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { listGuardianGroupsApi } from "../../services/guardianApi";
import { getGuardianGroupLastPreviewInfo } from "../../services/guardianGroupLocalStorage";
import { listNormalConversationPreviews } from "../../services/normalChatLocalStorage";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import { AppIcon } from "../../components/AppIcons";
import { ContactAvatar } from "../../components/ContactAvatar";
import { RelationTag } from "../../components/RelationTag";
import { contactDisplayName } from "../../lib/contactDisplay";
import { formatConvTime } from "../../lib/formatConvTime";
import type { ContactItem } from "../../types/contact";
import type { GuardianGroupListItem } from "../../types/guardian";

type Props = {
  onOpenChatRoom: (c: ContactItem) => void;
  onOpenGuardianGroup: (groupId: string) => void;
  onCreateGuardianGroup: () => void;
  onOpenGuardianHall: () => void;
};

type InboxRow =
  | { kind: "dm"; key: string; lastTs: number; lastText: string; contact: ContactItem }
  | { kind: "group"; key: string; lastTs: number; lastText: string; group: GuardianGroupListItem };

function guardianGroupTitle(g: GuardianGroupListItem): string {
  const name = g.name?.trim();
  if (name) return name;
  const count = g.memberCount ?? g.members?.length ?? 2;
  return `搭子群 · ${count}人`;
}

export function MessagesTab({
  onOpenChatRoom,
  onOpenGuardianGroup,
  onCreateGuardianGroup,
  onOpenGuardianHall,
}: Props) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [localConvPeers, setLocalConvPeers] = useState<{ peerUserId: string; lastText: string; lastTs: number }[]>([]);
  const [groups, setGroups] = useState<GuardianGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      setLoading(true);
      setErr("");
      try {
        const [{ items: cs }, { items: groupItems }] = await Promise.all([
          listContactsApi(),
          listGuardianGroupsApi(),
        ]);
        const previews = listNormalConversationPreviews(cs.map((c) => c.contactUserId));
        if (!cancelled) {
          setLocalConvPeers(previews);
          setContacts(cs);
          setGroups(groupItems);
        }
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
      if (
        msg.type === "message" ||
        msg.type === "guardian_group_message" ||
        msg.type === "guardian_group_updated"
      ) {
        load();
      }
    });
    return unsub;
  }, [load]);

  useEffect(() => {
    return load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const inboxRows = useMemo((): InboxRow[] => {
    const dmRows: InboxRow[] = localConvPeers.map((c) => {
      const contact =
        contacts.find((x) => x.contactUserId === c.peerUserId) ??
        ({
          contactUserId: c.peerUserId,
          phone: c.peerUserId,
          remark: null,
          nickname: null,
          avatarUrl: null,
          avatarUpdatedAt: null,
          relationType: null,
          defaultMolId: null,
          createdAt: c.lastTs,
        } satisfies ContactItem);
      return {
        kind: "dm",
        key: `dm-${c.peerUserId}`,
        lastTs: c.lastTs,
        lastText: c.lastText.trim() || "暂无消息",
        contact,
      };
    });

    const groupRows: InboxRow[] = groups.map((g) => {
      const local = getGuardianGroupLastPreviewInfo(g.id);
      const lastText = local?.text || g.lastText.trim() || "暂无消息";
      const lastTs = local?.ts || g.lastTs || g.createdAt;
      return {
        kind: "group",
        key: `group-${g.id}`,
        lastTs,
        lastText,
        group: g,
      };
    });

    return [...dmRows, ...groupRows].sort((a, b) => b.lastTs - a.lastTs);
  }, [contacts, groups, localConvPeers]);

  return (
    <div className="msg-tab-inner">
      <header className="aichat-topbar msg-tab-topbar aichat-topbar-flex">
        <h1>消息</h1>
        <button type="button" className="msg-tab__create" onClick={onCreateGuardianGroup}>
          发起群聊
        </button>
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
        ) : inboxRows.length === 0 ? (
          <div className="inbox-empty">
            <p className="inbox-empty__title">暂无会话</p>
            <p className="inbox-empty__sub">发起私聊或创建搭子群，开始对话</p>
            <div className="inbox-empty__actions">
              <button type="button" className="aichat-btn-primary" onClick={onCreateGuardianGroup}>
                发起群聊
              </button>
              <button type="button" className="aichat-btn-ghost" onClick={onOpenGuardianHall}>
                看看搭子
              </button>
            </div>
          </div>
        ) : (
          <ul className="msg-conv-list" aria-label="会话列表">
            {inboxRows.map((row) =>
              row.kind === "dm" ? (
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
                    <RelationTag type={row.contact.relationType} className="msg-conv-rel" />
                  </button>
                </li>
              ) : (
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
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
