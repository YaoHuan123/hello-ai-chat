import { useCallback, useEffect, useState } from "react";
import { acceptFriendRequestApi, listFriendRequestsApi, rejectFriendRequestApi } from "../services/friendRequestsApi";
import type { FriendRequestItem } from "../types/friendRequest";
import type { ContactItem } from "../types/contact";

type Props = {
  onBack: () => void;
  onChanged?: () => void;
  onOpenChatAfterAccept?: (peer: ContactItem) => void;
};

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

function phoneInitial(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.slice(-1) || "?";
}

export function FriendRequestsPage({ onBack, onChanged, onOpenChatAfterAccept }: Props) {
  const [items, setItems] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr("");
      try {
        const { items: next } = await listFriendRequestsApi("inbox");
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
  }, []);

  useEffect(() => load(), [load]);

  async function accept(id: number) {
    setBusyId(id);
    setErr("");
    try {
      const { request } = await acceptFriendRequestApi(id);
      onChanged?.();
      setItems((prev) => prev.filter((r) => r.id !== id));
      onOpenChatAfterAccept?.({
        contactUserId: request.fromUserId,
        phone: request.fromPhone,
        nickname: null,
        avatarUrl: null,
        avatarUpdatedAt: null,
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
      setItems((prev) => prev.filter((r) => r.id !== id));
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
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main fr-req-page">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}

        {loading ? (
          <p className="fr-req-empty">加载中…</p>
        ) : items.length === 0 ? (
          <p className="fr-req-empty">暂无好友请求</p>
        ) : (
          <ul className="fr-req-list">
            {items.map((r) => {
              const busy = busyId === r.id;
              const text = r.message?.trim() || "请求添加你为好友";
              return (
                <li key={r.id} className="fr-req-item">
                  <div className="fr-req-msg">
                    <span className="fr-req-msg__avatar" aria-hidden>
                      {phoneInitial(r.fromPhone)}
                    </span>
                    <div className="fr-req-msg__body">
                      <p className="fr-req-msg__from">
                        <strong>{maskPhone(r.fromPhone)}</strong>
                        <span> 请求添加你为好友</span>
                      </p>
                      <p className="fr-req-msg__text">{text}</p>
                      <div className="fr-req-msg__actions">
                        <button
                          type="button"
                          className="fr-req-msg__btn fr-req-msg__btn--accept"
                          disabled={busy}
                          onClick={() => void accept(r.id)}
                        >
                          同意
                        </button>
                        <button
                          type="button"
                          className="fr-req-msg__btn fr-req-msg__btn--reject"
                          disabled={busy}
                          onClick={() => void reject(r.id)}
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
