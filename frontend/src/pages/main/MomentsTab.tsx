import { useEffect, useMemo, useState } from "react";
import { listContactsApi } from "../../services/api";
import { listMomentsExploreRecords } from "../../services/momentsExploreChatLocalStorage";
import type { ContactItem } from "../../types/contact";
import type { MomentsExploreRecord } from "../../types/momentsExplore";
import type { RouteName } from "../../types/routes";

type Props = {
  onOpenFriend: (c: ContactItem) => void;
  onNavigateFeature: (route: RouteName) => void;
};

function maskPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

function displayName(c: ContactItem): string {
  const r = c.remark?.trim();
  if (r) return r;
  return maskPhoneDisplay(c.phone);
}

function avatarLetter(c: ContactItem): string {
  const r = c.remark?.trim();
  if (r) return r.slice(0, 1).toUpperCase();
  const d = c.phone.replace(/\D/g, "");
  if (d.length >= 1) return d.slice(-1);
  return "?";
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatExploreDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "今天";
  if (isSameDay(d, yesterday)) return "昨天";
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

type ExploreDayGroup = {
  dayKey: string;
  dayLabel: string;
  dayIso: string;
  records: MomentsExploreRecord[];
};

function groupExploreRecordsByDay(records: MomentsExploreRecord[]): ExploreDayGroup[] {
  const groups: ExploreDayGroup[] = [];
  for (const record of records) {
    const key = dayKey(record.ts);
    const last = groups[groups.length - 1];
    const d = new Date(record.ts);
    const dayIso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    if (last?.dayKey === key) {
      last.records.push(record);
    } else {
      groups.push({
        dayKey: key,
        dayLabel: formatExploreDay(record.ts),
        dayIso,
        records: [record],
      });
    }
  }
  return groups;
}

export function MomentsTab({ onOpenFriend, onNavigateFeature }: Props) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [feedEpoch, setFeedEpoch] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const { items } = await listContactsApi();
        if (!cancelled) setContacts(items);
      } catch (e: unknown) {
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
    const bump = () => setFeedEpoch((n) => n + 1);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.contactUserId, c])), [contacts]);

  const exploreRecords = useMemo(() => {
    void feedEpoch;
    return listMomentsExploreRecords(contacts.map((c) => c.contactUserId));
  }, [contacts, feedEpoch]);

  const exploreDayGroups = useMemo(() => groupExploreRecordsByDay(exploreRecords), [exploreRecords]);

  function openRecord(record: MomentsExploreRecord) {
    const c = contactById.get(record.peerUserId);
    if (c) onOpenFriend(c);
  }

  function pickContact(c: ContactItem) {
    setPickerOpen(false);
    onOpenFriend(c);
  }

  return (
    <div className="moments-tab-inner">
      <header className="aichat-topbar">
        <h1>朋友圈</h1>
      </header>

      <div className="aichat-main msg-tab-main moments-tab-scroll">
        {err && <p className="aichat-form-msg err">{err}</p>}
        {loading ? (
          <p className="aichat-muted-line" style={{ marginTop: 24 }}>
            加载中…
          </p>
        ) : (
          <>
            <div className="moments-tab-entry-list" role="group" aria-label="朋友圈入口">
              <button type="button" className="moments-tab-entry" onClick={() => setPickerOpen(true)}>
                <span className="moments-tab-entry__ico moments-tab-entry__ico--explore" aria-hidden>
                  探
                </span>
                <span className="moments-tab-entry__txt">
                  <b>探索好友</b>
                  <span>选联系人，和分身聊聊</span>
                </span>
                <span className="moments-tab-entry__arr" aria-hidden>
                  ›
                </span>
              </button>
              <button type="button" className="moments-tab-entry" onClick={() => onNavigateFeature("moments-my")}>
                <span className="moments-tab-entry__ico moments-tab-entry__ico--mine" aria-hidden>
                  我
                </span>
                <span className="moments-tab-entry__txt">
                  <b>我的日常</b>
                  <span>发布与管理动态</span>
                </span>
                <span className="moments-tab-entry__arr" aria-hidden>
                  ›
                </span>
              </button>
              <button type="button" className="moments-tab-entry" onClick={() => onNavigateFeature("moments-hot")}>
                <span className="moments-tab-entry__ico moments-tab-entry__ico--hot" aria-hidden>
                  热
                </span>
                <span className="moments-tab-entry__txt">
                  <b>热点</b>
                  <span>热门话题</span>
                </span>
                <span className="moments-tab-entry__arr" aria-hidden>
                  ›
                </span>
              </button>
            </div>

            <section className="moments-tab-section" aria-label="探索记录">
              {exploreRecords.length === 0 ? (
                <div className="moments-tab-empty-card">
                  <p>还没有有效探索。点「探索好友」选一位联系人，和 TA 的分身聊聊。</p>
                </div>
              ) : (
                <ul className="moments-tab-history" aria-label="探索记录列表">
                  {exploreDayGroups.map((group) => (
                    <li key={group.dayKey} className="moments-tab-history-day">
                      <time className="moments-tab-day-row" dateTime={group.dayIso}>
                        {group.dayLabel}
                      </time>
                      <ul className="moments-tab-history-rows">
                        {group.records.map((record) => {
                          const contact = contactById.get(record.peerUserId);
                          const name = contact ? displayName(contact) : "好友";
                          const letter = contact ? avatarLetter(contact) : "?";
                          return (
                            <li key={record.id}>
                              <button
                                type="button"
                                className="moments-tab-hist-row"
                                onClick={() => openRecord(record)}
                                disabled={!contact}
                              >
                                <span className="moments-tab-hist-av">{letter}</span>
                                <span className="moments-tab-hist-main">
                                  <b>{name}</b>
                                  <span>{record.question}</span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {pickerOpen && (
        <div className="aichat-modal" role="dialog" aria-modal aria-label="选择联系人" onClick={() => setPickerOpen(false)}>
          <div className="aichat-modal-box moments-contact-pick" onClick={(e) => e.stopPropagation()}>
            <h2 className="aichat-modal-t">选择联系人</h2>
            {contacts.length === 0 ? (
              <p className="aichat-muted-line" style={{ margin: "0 0 16px", textAlign: "center", lineHeight: 1.55 }}>
                暂无联系人。添加好友并互为联系人后，可在此探索对方的日常。
              </p>
            ) : (
              <ul className="aichat-list moments-friend-list moments-contact-pick-list" aria-label="联系人列表">
                {contacts.map((c) => (
                  <li key={c.contactUserId}>
                    <button type="button" className="aichat-nav-item moments-friend-row" onClick={() => pickContact(c)}>
                      <span className="moments-friend-avatar">{avatarLetter(c)}</span>
                      <span className="moments-friend-mid">
                        <span className="moments-friend-name">{displayName(c)}</span>
                      </span>
                      <span className="moments-friend-arrow" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="aichat-btn-ghost" style={{ width: "100%", marginTop: 4 }} onClick={() => setPickerOpen(false)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
