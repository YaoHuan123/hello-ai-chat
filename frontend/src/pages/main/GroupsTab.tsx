import { useCallback, useEffect, useMemo, useState } from "react";
import { listGuardianGroupsApi } from "../../services/guardianApi";
import { getGuardianGroupLastPreviewInfo } from "../../services/guardianGroupLocalStorage";
import { wsClient, type WsServerMessage } from "../../services/wsClient";
import { AppIcon } from "../../components/AppIcons";
import type { GuardianGroupListItem } from "../../types/guardian";

type Props = {
  onOpenGuardianGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  onOpenGuardianHall: () => void;
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

export function GroupsTab({ onOpenGuardianGroup, onCreateGroup, onOpenGuardianHall }: Props) {
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
        const { items } = await listGuardianGroupsApi();
        if (!cancelled) setGroups(items);
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
      if (msg.type === "guardian_group_message") {
        load();
      }
    });
    return unsub;
  }, [load]);

  useEffect(() => {
    return load();
  }, [load]);

  const rows = useMemo(() => {
    return groups
      .map((g) => {
        const local = getGuardianGroupLastPreviewInfo(g.id);
        const lastText = local?.text || g.lastText.trim() || "暂无消息";
        const lastTs = local?.ts || g.lastTs || g.createdAt;
        return { group: g, lastText, lastTs };
      })
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [groups]);

  return (
    <div className="msg-tab-inner groups-tab">
      <header className="aichat-topbar msg-tab-topbar aichat-topbar-flex groups-tab__topbar">
        <h1>群聊</h1>
        <button type="button" className="groups-tab__create" onClick={onCreateGroup}>
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
        ) : rows.length === 0 ? (
          <div className="groups-tab__empty">
            <p className="groups-tab__empty-title">还没有群聊</p>
            <p className="groups-tab__empty-sub">邀请联系人，选几位搭子一起进群</p>
            <div className="groups-tab__empty-actions">
              <button type="button" className="aichat-btn-primary" onClick={onCreateGroup}>
                发起群聊
              </button>
              <button type="button" className="aichat-btn-ghost" onClick={onOpenGuardianHall}>
                看看搭子
              </button>
            </div>
          </div>
        ) : (
          <ul className="msg-conv-list" aria-label="群聊列表">
            {rows.map(({ group, lastText, lastTs }) => (
              <li key={group.id}>
                <button
                  type="button"
                  className="msg-conv-row msg-conv-row--guardian"
                  onClick={() => onOpenGuardianGroup(group.id)}
                >
                  <span className="msg-conv-avatar msg-conv-avatar--guardian" aria-hidden>
                    <AppIcon name="usersGroup" className="app-icon app-icon--md app-icon--guardian" />
                  </span>
                  <span className="msg-conv-body">
                    <span className="msg-conv-head">
                      <span className="msg-conv-title">
                        {guardianGroupTitle(group)}
                        <span className="msg-conv-scene-tag">{group.scene}</span>
                      </span>
                      <span className="msg-conv-time">{formatConvTime(lastTs)}</span>
                    </span>
                    <span className="msg-conv-preview">
                      {group.memberPreview ? `${group.memberPreview} · ` : ""}
                      {lastText}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
