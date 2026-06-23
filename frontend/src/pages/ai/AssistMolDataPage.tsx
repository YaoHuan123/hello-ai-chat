import { useEffect, useMemo, useState } from "react";
import { SUYAN, formatSuyanDisplayName, normalizeLegacySuyanName } from "../../constants/suyanCopy";
import { getMyMolDetailForEdit, removeMyMol, updateMyMol, type MolInMyCollection } from "../../services/stageApi";
import { ensureAssistMolDefaults, getAssistMolItems } from "../../services/molDataLocalStorage";

type Props = {
  molId: string;
  onBack: () => void;
  onRemoved?: () => void;
};

function RenameMolModal({
  initialName,
  busy,
  err,
  onClose,
  onSave,
}: {
  initialName: string;
  busy: boolean;
  err: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div
      className="aichat-moldt-info-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4 className="aichat-moldt-info-form__h">修改名称</h4>
        <label className="aichat-moldt-info-form__lab" htmlFor="assist-mol-rename">
          {SUYAN.name}
        </label>
        <input
          id="assist-mol-rename"
          className="aichat-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && !busy) onSave(name);
          }}
        />
        {err && <p className="aichat-form-msg err">{err}</p>}
        <div className="aichat-moldt-info-form__act">
          <button type="button" className="aichat-btn-ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="aichat-btn-primary aichat-btn-fit" disabled={busy || !name.trim()} onClick={() => onSave(name)}>
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssistMolDataPage({ molId, onBack, onRemoved }: Props) {
  const [molName, setMolName] = useState("");
  const [canRename, setCanRename] = useState(false);
  const [molSource, setMolSource] = useState<MolInMyCollection["source"] | null>(null);
  const [uploaderIsMe, setUploaderIsMe] = useState<boolean | undefined>(undefined);
  const [molWorldId, setMolWorldId] = useState(molId);
  const [loadErr, setLoadErr] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [renameErr, setRenameErr] = useState("");
  const [itemEpoch, setItemEpoch] = useState(0);

  const items = useMemo(() => getAssistMolItems(molId), [molId, itemEpoch]);

  useEffect(() => {
    let cancelled = false;
    getMyMolDetailForEdit(molId)
      .then(({ item }) => {
        if (cancelled) return;
        setMolName(formatSuyanDisplayName(item.name));
        setCanRename(item.uploaderIsMe !== false && item.source === "created");
        setMolSource(item.source);
        setUploaderIsMe(item.uploaderIsMe);
        setMolWorldId(item.id);
        setLoadErr("");
        if (ensureAssistMolDefaults(molId, item.primaryCategory)) {
          setItemEpoch((n) => n + 1);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [molId]);

  function openRename() {
    setRenameErr("");
    setRenameOpen(true);
  }

  function closeRename() {
    if (renameBusy) return;
    setRenameOpen(false);
    setRenameErr("");
  }

  async function saveRename(name: string) {
    const trimmed = normalizeLegacySuyanName(name.trim());
    if (!trimmed) {
      setRenameErr(`请输入${SUYAN.name}名称。`);
      return;
    }
    if (trimmed === molName) {
      closeRename();
      return;
    }
    setRenameBusy(true);
    setRenameErr("");
    try {
      await updateMyMol(molId, { name: trimmed });
      setMolName(trimmed);
      setRenameOpen(false);
    } catch (e: unknown) {
      setRenameErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleRemoveMol() {
    if (removeBusy || renameBusy) return;
    const displayName = molName || SUYAN.name;
    if (!window.confirm(`确定从「${SUYAN.my}」移除「${displayName}」？`)) return;

    const isUploader = uploaderIsMe === true || (uploaderIsMe !== false && molSource === "created");
    let deleteFromWorld: boolean | undefined;
    if (isUploader && !molWorldId.startsWith("mp-")) {
      deleteFromWorld = window.confirm(SUYAN.deleteFromWorldConfirm);
    }

    setRemoveBusy(true);
    setLoadErr("");
    try {
      await removeMyMol(molId, isUploader ? { deleteFromWorld: Boolean(deleteFromWorld) } : undefined);
      if (onRemoved) onRemoved();
      else onBack();
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="aichat-shell assist-mol-a-shell">
      <header className="aichat-topbar aichat-topbar-flex assist-mol-a-topbar">
        <button className="assist-mol-a-topbar__link" type="button" onClick={onBack}>
          返回
        </button>
        <div className="assist-mol-a-topbar__mid">
          <h1>{formatSuyanDisplayName(molName) || SUYAN.data}</h1>
          <p>约束 · {items.length}</p>
        </div>
        <div className="assist-mol-a-topbar__actions">
          {canRename ? (
            <button className="assist-mol-a-topbar__link" type="button" onClick={openRename} disabled={removeBusy || renameBusy}>
              重命名
            </button>
          ) : null}
          <button
            className="assist-mol-a-topbar__link assist-mol-a-topbar__link--danger"
            type="button"
            onClick={handleRemoveMol}
            disabled={removeBusy || renameBusy}
          >
            {removeBusy ? "删除中…" : "删除"}
          </button>
        </div>
      </header>

      <div className="assist-mol-a-scroll">
        {loadErr && <p className="aichat-form-msg err">{loadErr}</p>}

        {items.length === 0 ? (
          <div className="assist-mol-a-empty assist-mol-a-empty--compact">
            <p className="assist-mol-a-empty__d">暂无约束。</p>
          </div>
        ) : (
          <div className="assist-mol-a-data-list" aria-label="约束列表">
            {items.map((it) => (
              <div key={it.id} className="assist-mol-a-data-card assist-mol-a-data-card--readonly">
                <span className="assist-mol-a-data-card__tag assist-mol-a-data-card__tag--r">约束</span>
                <h3 className="assist-mol-a-data-card__title">{it.title}</h3>
                <p className="assist-mol-a-data-card__body">{it.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {renameOpen && (
        <RenameMolModal initialName={molName} busy={renameBusy} err={renameErr} onClose={closeRename} onSave={saveRename} />
      )}
    </div>
  );
}
