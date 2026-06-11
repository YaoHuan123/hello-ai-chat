import { SUYAN, formatSuyanDisplayName } from "../../constants/suyanCopy";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { MolInMyCollection } from "../../services/stageApi";

type Props = {
  mols: MolInMyCollection[];
  currentId: string;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onEditMol?: (id: string) => void;
};

export function ChatMolSwitchModal({ mols, currentId, onClose, onConfirm, onEditMol }: Props) {
  const [sel, setSel] = useState(currentId);

  return createPortal(
    <div
      className="aichat-modal aichat-modal--chat-mol"
      role="dialog"
      aria-modal
      aria-labelledby="chat-mol-switch-title"
      onClick={onClose}
    >
      <div className="aichat-modal-box aichat-modal-box--chat-mol" onClick={(e) => e.stopPropagation()}>
        <h2 id="chat-mol-switch-title" className="aichat-modal-t">
          {SUYAN.select}
        </h2>
        <ul className="aichat-mol-pick">
          {mols.map((m) => {
            const active = m.id === sel;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`aichat-mol-row ${active ? "active" : ""}`}
                  onClick={() => {
                    setSel(m.id);
                    onConfirm(m.id);
                    onClose();
                  }}
                >
                  <span className="msg-mol-pick-avatar" aria-hidden>
                    {formatSuyanDisplayName(m.name).trim().slice(0, 1) || SUYAN.defaultBadge}
                  </span>
                  <span className="aichat-mol-name">
                    <span className="msg-mol-pick-name">{formatSuyanDisplayName(m.name)}</span>
                    <span className="msg-mol-pick-sub">{m.primaryCategory}</span>
                  </span>
                  <span className="aichat-mol-check" aria-hidden>
                    {active ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {onEditMol ? (
          <button
            type="button"
            className="aichat-btn-ghost msg-mol-switch-actions__edit"
            onClick={() => onEditMol(sel)}
          >
            修改资料
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
