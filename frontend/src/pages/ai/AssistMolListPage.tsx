import { useCallback, useEffect, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../../constants/suyanCopy";
import { getAssistMolItems } from "../../services/molDataLocalStorage";
import { createMyMolAuto, getMyMols, type MolInMyCollection } from "../../services/stageApi";

const MAX_MOLS = 6;

type Props = {
  onBack: () => void;
  onOpenWorld: () => void;
  onOpenData: (molId: string) => void;
};

function molDataCounts(molId: string) {
  const items = getAssistMolItems(molId);
  return {
    dialogue: items.filter((x) => x.type === "dialogue").length,
    rule: items.filter((x) => x.type === "rule").length,
  };
}

function MolCard({ m, onOpen }: { m: MolInMyCollection; onOpen: () => void }) {
  const { dialogue, rule } = molDataCounts(m.id);
  const hasContent = dialogue + rule > 0;

  return (
    <button type="button" className="assist-mol-a-card" onClick={onOpen}>
      <div className="assist-mol-a-card__head">
        <h2 className="assist-mol-a-card__name">{formatSuyanDisplayName(m.name)}</h2>
        <span className="assist-mol-a-card__chev" aria-hidden>
          ›
        </span>
      </div>
      <p className="assist-mol-a-card__cat">{hasContent ? "点击进入添加或编辑内容" : "点击进入添加对话样例与约束"}</p>
      <div className="assist-mol-a-card__stats">
        <span className="assist-mol-a-stat assist-mol-a-stat--d">{dialogue} 样例</span>
        <span className="assist-mol-a-stat assist-mol-a-stat--r">{rule} 约束</span>
      </div>
    </button>
  );
}

export function AssistMolListPage({ onBack, onOpenWorld, onOpenData }: Props) {
  const [items, setItems] = useState<MolInMyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [listEpoch, setListEpoch] = useState(0);
  const [creating, setCreating] = useState(false);
  void listEpoch;

  const refresh = useCallback(() => {
    return getMyMols()
      .then((next) => {
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

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setErr("");
    try {
      await createMyMolAuto(items.map((m) => m.name));
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

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
            <p className="assist-mol-a-empty__d">{SUYAN.emptyAutoCreateHint}</p>
          </div>
        ) : (
          <div className="assist-mol-a-list" aria-label={`${SUYAN.name}列表`}>
            {displayItems.map((m) => (
              <MolCard key={m.id} m={m} onOpen={() => onOpenData(m.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="assist-mol-a-dock">
        <button type="button" className="assist-mol-a-dock__btn assist-mol-a-dock__btn--sec" onClick={onOpenWorld} disabled={loading || atCap || creating}>
          {SUYAN.addFromWorld}
        </button>
        <button type="button" className="assist-mol-a-dock__btn assist-mol-a-dock__btn--pri" onClick={handleCreate} disabled={loading || atCap || creating}>
          {creating ? "创建中…" : SUYAN.create}
        </button>
      </div>
    </div>
  );
}
