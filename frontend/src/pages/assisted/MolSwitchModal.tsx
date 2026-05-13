import { useState } from "react";
import type { MolProfile } from "../../data/molMock";

type Props = {
  mols: MolProfile[];
  currentId: string;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

/** 由父级在需要显示时 `switchOpen && <MolSwitchModal key={molId} ... />` 挂载，不接收 `open`，避免与 `currentId` 不同步。 */
export function MolSwitchModal({ mols, currentId, onClose, onConfirm }: Props) {
  const [sel, setSel] = useState(currentId);

  return (
    <div className="aichat-modal" role="dialog" aria-modal onClick={onClose}>
      <div className="aichat-modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="aichat-modal-t">选择 Mol</h2>
        <ul className="aichat-mol-pick">
          {mols.map((m) => {
            const active = m.id === sel;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`aichat-mol-row ${active ? "active" : ""}`}
                  onClick={() => setSel(m.id)}
                >
                  <img src={m.avatar} width={36} height={36} className="aichat-mol-avatar-m" alt="" />
                  <span className="aichat-mol-name">{m.name}</span>
                  <span className="aichat-mol-check" aria-hidden>
                    {active ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="aichat-btn-confirm"
          onClick={() => {
            onConfirm(sel);
            onClose();
          }}
        >
          确认选择
        </button>
      </div>
    </div>
  );
}
