import { useCallback, useEffect, useState } from "react";
import {
  acceptFriendRequestApi,
  cancelFriendRequestApi,
  listFriendRequestsApi,
  rejectFriendRequestApi,
} from "../services/friendRequestsApi";
import type { FriendRequestItem } from "../types/friendRequest";
import type { ContactItem } from "../types/contact";

type Props = {
  onBack: () => void;
  onChanged?: () => void;
  onOpenChatAfterAccept?: (peer: ContactItem) => void;
};

type TabId = "inbox" | "outbox";

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

export function FriendRequestsPage({ onBack, onChanged, onOpenChatAfterAccept }: Props) {
  const [tab, setTab] = useState<TabId>("inbox");
  const [items, setItems] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refetchList() {
    setLoading(true);
    setErr("");
    try {
      const { items: next } = await listFriendRequestsApi(tab);
      setItems(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const load = useCallback(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const { items: next } = await listFriendRequestsApi(tab);
        if (!cancelled) setItems(next);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    return load();
  }, [load]);

  async function accept(id: number) {
    setBusyId(id);
    setErr("");
    try {
      const { request } = await acceptFriendRequestApi(id);
      onChanged?.();
      await refetchList();
      onOpenChatAfterAccept?.({
        contactUserId: request.fromUserId,
        phone: request.fromPhone,
        remark: null,
        createdAt: request.decidedAt ?? request.createdAt,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    setErr("");
    try {
      await rejectFriendRequestApi(id);
      onChanged?.();
      await refetchList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: number) {
    setBusyId(id);
    setErr("");
    try {
      await cancelFriendRequestApi(id);
      onChanged?.();
      await refetchList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>好友请求</h1>
          <p>{tab === "inbox" ? "收到的申请" : "发出的申请"}</p>
        </div>
        <span style={{ width: 44, flexShrink: 0 }} aria-hidden />
      </header>

      <div className="aichat-main" style={{ paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={tab === "inbox" ? "aichat-btn-primary" : "aichat-btn-ghost"}
            style={{ flex: 1 }}
            onClick={() => setTab("inbox")}
          >
            收件箱
          </button>
          <button
            type="button"
            className={tab === "outbox" ? "aichat-btn-primary" : "aichat-btn-ghost"}
            style={{ flex: 1 }}
            onClick={() => setTab("outbox")}
          >
            发件箱
          </button>
        </div>

        {err && <p className="aichat-form-msg err">{err}</p>}

        {loading ? (
          <p className="aichat-muted-line">加载中…</p>
        ) : items.length === 0 ? (
          <div className="aichat-card" style={{ textAlign: "center", padding: 24 }}>
            <p style={{ margin: 0, color: "var(--aichat-muted)" }}>暂无记录</p>
          </div>
        ) : (
          <ul className="aichat-list" style={{ marginTop: 8 }}>
            {items.map((r) => (
              <li key={r.id} className="aichat-card" style={{ marginBottom: 10, padding: 12 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                  {tab === "inbox" ? `来自 ${maskPhone(r.fromPhone)}` : `发往 ${maskPhone(r.toPhone)}`}
                </p>
                {r.message ? (
                  <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--aichat-muted)" }}>{r.message}</p>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {tab === "inbox" ? (
                    <>
                      <button
                        type="button"
                        className="aichat-btn-primary"
                        disabled={busyId === r.id}
                        onClick={() => void accept(r.id)}
                      >
                        同意
                      </button>
                      <button
                        type="button"
                        className="aichat-btn-ghost"
                        disabled={busyId === r.id}
                        onClick={() => void reject(r.id)}
                      >
                        拒绝
                      </button>
                    </>
                  ) : (
                    <button type="button" className="aichat-btn-ghost" disabled={busyId === r.id} onClick={() => void cancel(r.id)}>
                      撤回
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
