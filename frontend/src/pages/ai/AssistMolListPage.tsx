import { useCallback, useEffect, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../../constants/suyanCopy";
import { getAssistMolItems, ensureAssistMolDefaults } from "../../services/molDataLocalStorage";
import { getMyMols, removeMyMol, type MolInMyCollection } from "../../services/stageApi";

const MAX_MOLS = 6;

type Props = {
  onBack: () => void;
  onOpenWorld: () => void;
  onOpenData: (molId: string) => void;
};

function molRuleCount(molId: string) {
  return getAssistMolItems(molId).length;
}

function MolCard({
  m,
  onOpen,
  onDelete,
  busy,
}: {
  m: MolInMyCollection;
  onOpen: () => void;
  onDelete: (m: MolInMyCollection) => void;
  busy: boolean;
}) {
  const ruleCount = molRuleCount(m.id);
  const displayName = formatSuyanDisplayName(m.name);

  return (
    <div className="assist-mol-a-card">
      <button type="button" className="assist-mol-a-card__body" onClick={onOpen} disabled={busy}>
        <div className="assist-mol-a-card__head">
          <h2 className="assist-mol-a-card__name">{displayName}</h2>
          <span className="assist-mol-a-card__chev" aria-hidden>
            ›
          </span>
        </div>
        <p className="assist-mol-a-card__cat">点击查看约束</p>
        <div className="assist-mol-a-card__stats">
          <span className="assist-mol-a-stat assist-mol-a-stat--r">{ruleCount} 约束</span>
        </div>
      </button>
      <button
        type="button"
        className="assist-mol-a-card__del"
        onClick={() => onDelete(m)}
        disabled={busy}
        aria-label={`删除${displayName}`}
      >
        删除
      </button>
    </div>
  );
}

export function AssistMolListPage({ onBack, onOpenWorld, onOpenData }: Props) {
  const [items, setItems] = useState<MolInMyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [listEpoch, setListEpoch] = useState(0);
  const [removing, setRemoving] = useState(false);
  void listEpoch;

  const refresh = useCallback(() => {
    return getMyMols()
      .then((next) => {
        for (const m of next) {
          ensureAssistMolDefaults(m.id, m.primaryCategory);
        }
        setItems(next);
        setListEpoch((n) => n + 1);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function handleDelete(m: MolInMyCollection) {
    if (removing) return;
    const displayName = formatSuyanDisplayName(m.name);
    if (!window.confirm(`确定从「${SUYAN.my}」移除「${displayName}」？`)) return;

    const isUploader = m.uploaderIsMe === true || (m.uploaderIsMe !== false && m.source === "created");
    let deleteFromWorld: boolean | undefined;
    if (isUploader && !m.id.startsWith("mp-")) {
      deleteFromWorld = window.confirm(SUYAN.deleteFromWorldConfirm);
    }

    setRemoving(true);
    setErr("");
    try {
      await removeMyMol(m.id, isUploader ? { deleteFromWorld: Boolean(deleteFromWorld) } : undefined);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(false);
    }
  }

  const busy = removing;
  const atCap = items.length >= MAX_MOLS;
  const displayItems = items.slice(0, MAX_MOLS);
  const overflow = items.length > MAX_MOLS;

  return (
    <div className="aichat-shell assist-mol-a-shell">
      <header className="aichat-topbar aichat-topbar-flex assist-mol-a-topbar">
        <button className="assist-mol-a-topbar__link" type="button" onClick={onBack}>
          返回
        </button>
        <div className="assist-mol-a-topbar__mid">
          <h1>{SUYAN.my}</h1>
        </div>
        <span className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="assist-mol-a-scroll">
        {err && <p className="aichat-form-msg err">{err}</p>}
        {!loading && (
          <span className="assist-mol-a-quota" role="status">
            已用 {items.length} / {MAX_MOLS}
          </span>
        )}
        {overflow ? (
          <p className="assist-mol-a-notice">仅显示前 {MAX_MOLS} 个</p>
        ) : null}
        {atCap && !overflow ? (
          <p className="assist-mol-a-notice">已达上限</p>
        ) : null}

        {loading ? null : displayItems.length === 0 ? (
          <div className="assist-mol-a-empty">
            <p className="assist-mol-a-empty__t">暂无{SUYAN.name}</p>
            <p className="assist-mol-a-empty__d">{SUYAN.emptyAddHint}</p>
          </div>
        ) : (
          <div className="assist-mol-a-list" aria-label={`${SUYAN.name}列表`}>
            {displayItems.map((m) => (
              <MolCard key={`${m.id}-${listEpoch}`} m={m} onOpen={() => onOpenData(m.id)} onDelete={handleDelete} busy={busy} />
            ))}
          </div>
        )}
      </div>

      <div className="assist-mol-a-dock">
        <button type="button" className="assist-mol-a-dock__btn assist-mol-a-dock__btn--pri" onClick={onOpenWorld} disabled={loading || atCap || busy}>
          {SUYAN.addFromWorld}
        </button>
      </div>
    </div>
  );
}
