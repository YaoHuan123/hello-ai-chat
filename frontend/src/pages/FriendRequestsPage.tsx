import { useCallback, useEffect, useState } from "react";
import {
  RELATION_ACCEPT_QUICK_TYPES,
  relationLabel,
  type RelationType,
} from "../constants/relationTypes";
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
  const [relationById, setRelationById] = useState<Record<number, RelationType>>({});

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

  function pickRelation(id: number): RelationType | null {
    return relationById[id] ?? null;
  }

  async function accept(id: number) {
    const relationType = pickRelation(id);
    if (!relationType) {
      setErr("请选择关系类型");
      return;
    }
    setBusyId(id);
    setErr("");
    try {
      const { request } = await acceptFriendRequestApi(id, relationType);
      onChanged?.();
      setItems((prev) => prev.filter((r) => r.id !== id));
      onOpenChatAfterAccept?.({
        contactUserId: request.fromUserId,
        phone: request.fromPhone,
        nickname: null,
        avatarUrl: null,
        avatarUpdatedAt: null,
        gender: null,
        remark: null,
        relationType,
        defaultMolId: null,
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
          <h1>新的好友</h1>
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
              const selected = pickRelation(r.id);
              return (
                <li key={r.id} className="fr-req-item">
                  <div className="fr-req-card">
                    <div className="fr-req-card__head">
                      <span className="fr-req-msg__avatar" aria-hidden>
                        {phoneInitial(r.fromPhone)}
                      </span>
                      <div>
                        <strong>{maskPhone(r.fromPhone)}</strong>
                      </div>
                    </div>
                    <p className="fr-req-card__msg">{text}</p>
                    <p className="fr-req-card__label">接受后，标记为</p>
                    <div className="rel-grid rel-grid--compact" role="listbox" aria-label="关系类型">
                      {RELATION_ACCEPT_QUICK_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="option"
                          aria-selected={selected === t}
                          className={`rel-opt ${selected === t ? "selected" : ""}`}
                          disabled={busy}
                          onClick={() => setRelationById((prev) => ({ ...prev, [r.id]: t }))}
                        >
                          {relationLabel(t)}
                        </button>
                      ))}
                    </div>
                    <div className="fr-req-card__actions">
                      <button
                        type="button"
                        className="aichat-btn-ghost fr-req-card__btn"
                        disabled={busy}
                        onClick={() => void reject(r.id)}
                      >
                        拒绝
                      </button>
                      <button
                        type="button"
                        className="aichat-btn-primary fr-req-card__btn"
                        disabled={busy || !selected}
                        onClick={() => void accept(r.id)}
                      >
                        接受并保存
                      </button>
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
