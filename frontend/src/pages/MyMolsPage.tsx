import { useCallback, useEffect, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../constants/suyanCopy";
import { getMyMols, removeMyMol, type MolInMyCollection } from "../services/stageApi";

type Props = {
  onBack: () => void;
  onOpenWorld: () => void;
  onOpenDetail: (id: "new" | string) => void;
};

function MolItemCard({
  m,
  onEdit,
  onDelete,
  busy,
}: {
  m: MolInMyCollection;
  onEdit: (m: MolInMyCollection) => void;
  onDelete: (m: MolInMyCollection) => void;
  busy: boolean;
}) {
  return (
    <div className="aichat-card aichat-page-card aichat-mol-tile aichat-mymols-tile">
      <div className="aichat-mymols-tile__row">
        <div className="aichat-mymols-tile__main">
          <h2 className="aichat-panel-title">{formatSuyanDisplayName(m.name)}</h2>
          <div className="aichat-mymols-badges" aria-label="来源与状态">
            {m.source === "store" ? (
              <span className="aichat-mymols-badge aichat-mymols-badge--store">{SUYAN.fromWorldBadge}</span>
            ) : (
              <span className="aichat-mymols-badge aichat-mymols-badge--own">自己创建</span>
            )}
            {m.source === "store" && m.price > 0 && <span className="aichat-mymols-pricenote">已应用 · ¥{m.price}</span>}
            {m.source === "store" && m.price === 0 && <span className="aichat-mymols-pricenote">已应用 · 免费</span>}
            <span className="aichat-tag-ok">已拥有</span>
          </div>
        </div>
        <div className="aichat-mymols-tile__actions" role="group" aria-label="操作">
          <button type="button" className="aichat-mymols-linkbtn" onClick={() => onEdit(m)} disabled={busy}>
            管理
          </button>
          <button type="button" className="aichat-mymols-linkbtn aichat-mymols-linkbtn--danger" onClick={() => onDelete(m)} disabled={busy}>
            删除
          </button>
        </div>
      </div>
      <p className="aichat-mol-catline">{m.primaryCategory}</p>
      <p className="aichat-card-hint">{m.summary}</p>
      <div className="aichat-tag-wrap">
        {(m.taskTags ?? []).slice(0, 4).map((t) => (
          <span key={t} className="aichat-tag-s">
            {t}
          </span>
        ))}
        {(m.taskTags ?? []).length === 0 && m.source === "created" && <span className="aichat-mymols-pricenote">在详情页中完善信息集</span>}
      </div>
    </div>
  );
}

export function MyMolsPage({ onBack, onOpenWorld, onOpenDetail }: Props) {
  const [items, setItems] = useState<MolInMyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(() => {
    return getMyMols().then(setItems).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setErr("");
    });
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  function openNew() {
    onOpenDetail("new");
  }

  function openEdit(m: MolInMyCollection) {
    onOpenDetail(m.id);
  }

  async function handleDelete(m: MolInMyCollection) {
    const isUploader = m.uploaderIsMe === true || (m.uploaderIsMe !== false && m.source === "created");
    if (!window.confirm(`确定从「我的」移除「${formatSuyanDisplayName(m.name)}」？`)) return;
    let deleteFromWorld: boolean | undefined;
    if (isUploader) {
      deleteFromWorld = window.confirm(SUYAN.deleteFromWorldConfirm);
    }
    setSaving(true);
    setErr("");
    try {
      await removeMyMol(m.id, isUploader ? { deleteFromWorld: Boolean(deleteFromWorld) } : undefined);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="aichat-shell">
        <header className="aichat-topbar aichat-topbar-flex">
          <button className="aichat-btn-ghost" type="button" onClick={onBack}>
            返回
          </button>
          <div className="aichat-stage-head">
            <h1>{SUYAN.my}</h1>
            <p>已解锁能力</p>
          </div>
          <div className="aichat-topbar-spacer" aria-hidden />
        </header>
        <div className="aichat-main aichat-page-main">
          <div className="aichat-card">正在加载…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aichat-shell aichat-mymols">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>{SUYAN.my}</h1>
          <p>共 {items.length} 个</p>
        </div>
        <button className="aichat-btn-ghost" type="button" onClick={onOpenWorld} disabled={saving}>
          {SUYAN.world}
        </button>
      </header>

      <div className="aichat-main aichat-page-main aichat-mymols-main">
        {err && <p className="aichat-form-msg err">{err}</p>}

        <div className="aichat-mymols-toolbar">
          <p className="aichat-mymols-hint">{SUYAN.mineHint}</p>
          <button type="button" className="aichat-btn-primary aichat-mymols-btn-new" onClick={openNew} disabled={saving}>
            {SUYAN.create}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="aichat-card aichat-page-card aichat-mymols-empty">
            <p className="aichat-mymols-empty__t">{SUYAN.mineEmpty}</p>
            <p className="aichat-mymols-empty__d">{SUYAN.mineEmptyDetail}</p>
            <div className="aichat-mymols-empty__row">
              <button type="button" className="aichat-btn-primary aichat-mymols-empty__cta" onClick={openNew} disabled={saving}>
                {SUYAN.createQuick}
              </button>
              <button type="button" className="aichat-btn-ghost aichat-mymols-empty__cta" onClick={onOpenWorld} disabled={saving}>
                {SUYAN.openWorld}
              </button>
            </div>
          </div>
        ) : (
          <div className="aichat-mymols-stack" role="list">
            {items.map((m) => (
              <div key={m.id} className="aichat-mymols-item" role="listitem">
                <MolItemCard m={m} onEdit={openEdit} onDelete={handleDelete} busy={saving} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
