import { useCallback, useEffect, useState } from "react";
import { getMyMols, type MolInMyCollection } from "../../services/stageApi";

const MAX_MOLS = 6;

type Props = {
  onBack: () => void;
  onOpenWorld: () => void;
  onOpenData: (molId: string) => void;
  onNewMol: () => void;
};

function MolRow({ m, onOpen }: { m: MolInMyCollection; onOpen: () => void }) {
  return (
    <button type="button" className="aichat-nav-item" style={{ textAlign: "left", width: "100%" }} onClick={onOpen}>
      <span style={{ fontWeight: 600 }}>{m.name}</span>
      <span className="phase">{m.primaryCategory}</span>
    </button>
  );
}

export function AssistMolListPage({ onBack, onOpenWorld, onOpenData, onNewMol }: Props) {
  const [items, setItems] = useState<MolInMyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const refresh = useCallback(() => {
    return getMyMols()
      .then(setItems)
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

  const atCap = items.length >= MAX_MOLS;
  const displayItems = items.slice(0, MAX_MOLS);
  const overflow = items.length > MAX_MOLS;

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>辅助聊天 MOL</h1>
          <p>共 {items.length} 个 · 上限 {MAX_MOLS}</p>
        </div>
        <button className="aichat-btn-ghost" type="button" onClick={onOpenWorld} disabled={atCap}>
          MOL 世界
        </button>
      </header>

      <div className="aichat-main aichat-page-main">
        {err && <p className="aichat-form-msg err">{err}</p>}
        {overflow && (
          <div className="aichat-card" style={{ marginBottom: 12, fontSize: 14, color: "var(--aichat-muted)" }}>
            当前超过上限，仅显示前 {MAX_MOLS} 个。请在「更多功能」中进入「我的 Mol」管理已应用项。
          </div>
        )}
        {atCap && (
          <div className="aichat-card" style={{ marginBottom: 12, fontSize: 14 }}>
            已达上限 {MAX_MOLS} 个，无法新建或从 MOL 世界继续拉取，请先移除不再使用的 MOL。
          </div>
        )}

        <div className="aichat-mymols-toolbar" style={{ marginBottom: 12 }}>
          <button type="button" className="aichat-btn-primary" onClick={onNewMol} disabled={loading || atCap}>
            新建 MOL
          </button>
        </div>

        {loading ? (
          <div className="aichat-card">加载中…</div>
        ) : displayItems.length === 0 ? (
          <div className="aichat-card aichat-page-card">
            <p style={{ margin: 0, fontWeight: 600 }}>暂无 MOL</p>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--aichat-muted)", lineHeight: 1.5 }}>
              可新建，或通过右上角「MOL 世界」拉取模板到列表（未满 {MAX_MOLS} 个时）。
            </p>
          </div>
        ) : (
          <ul className="aichat-list" aria-label="MOL 列表">
            {displayItems.map((m) => (
              <li key={m.id}>
                <MolRow m={m} onOpen={() => onOpenData(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
