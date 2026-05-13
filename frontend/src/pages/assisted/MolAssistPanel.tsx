import type { InferredContext, MolProfile } from "../../data/molMock";
import { POLISH_TONES, type PolishTone } from "../../data/polishMock";

export type PolishUiCandidate = {
  id: string;
  tag: string;
  text: string;
  done: boolean;
  version: number;
  fromCache?: boolean;
};

type Props = {
  open: boolean;
  mol: MolProfile;

  inferredIntents: InferredContext[];
  selectedInferredIndex: number;
  inferredStep: "intent" | "reply";
  onSelectInferredIntent: (index: number) => void;
  onBackToInferredIntent: () => void;
  inferredIntentLabel: string;
  contextReplyList: string[];
  onSelectContextReply: (text: string) => void;

  showPolish: boolean;
  polishDraft: string;
  polishTone: PolishTone;
  polishCandidates: PolishUiCandidate[];
  polishStale: boolean;
  onChangeTone: (t: PolishTone) => void;
  onAdoptCandidate: (text: string) => void;
  onRegenerateAll: () => void;

  onSwitch: () => void;
  onClose: () => void;
  onLoadMore: () => void;
  loadMoreVisible: boolean;
  loadMoreDone: boolean;
};

export function MolAssistPanel({
  open,
  mol,
  inferredIntents,
  selectedInferredIndex,
  inferredStep,
  onSelectInferredIntent,
  onBackToInferredIntent,
  inferredIntentLabel,
  contextReplyList,
  onSelectContextReply,
  showPolish,
  polishDraft,
  polishTone,
  polishCandidates,
  polishStale,
  onChangeTone,
  onAdoptCandidate,
  onRegenerateAll,
  onSwitch,
  onClose,
  onLoadMore,
  loadMoreVisible,
  loadMoreDone,
}: Props) {
  if (!open) {
    return null;
  }

  const multiIntent = inferredIntents.length > 1;
  const longDraft = polishDraft.length > 200;

  return (
    <>
      <button
        type="button"
        className="aichat-assist-panel-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="aichat-assist-panel" role="dialog" aria-label="接话" key={mol.id}>
        <div className="aichat-mol-header aichat-mol-header--simple">
          <div className="aichat-mol-current">
            <img src={mol.avatar} width={24} height={24} className="aichat-mol-avatar-s" alt="" />
            <span>{mol.name}</span>
          </div>
          <button type="button" className="aichat-mol-link" onClick={onSwitch}>
            换 Mol
          </button>
        </div>

        {showPolish && (
          <div className="aichat-assist-section aichat-polish">
            {polishStale && (
              <div className="aichat-polish-stale" role="status">
                <span>原文已变更</span>
                <button
                  type="button"
                  className="aichat-polish-stale__btn"
                  onClick={onRegenerateAll}
                >
                  重新润色
                </button>
              </div>
            )}

            <div className="aichat-polish-tones" role="tablist" aria-label="润色语气">
              {POLISH_TONES.map((t) => {
                const active = t.id === polishTone;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={
                      active ? "aichat-polish-tone aichat-polish-tone--active" : "aichat-polish-tone"
                    }
                    onClick={() => onChangeTone(t.id)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {longDraft && (
              <p className="aichat-polish-long-hint">较长内容，第一版约 1–2 秒。</p>
            )}

            <ul className="aichat-polish-cards">
              {polishCandidates.map((card) => {
                const pickable = card.done && card.text.trim().length > 0;
                return (
                  <li key={card.id} className="aichat-polish-card">
                    {card.version > 1 && (
                      <div className="aichat-polish-card__head">
                        <span className="aichat-polish-card__version">v{card.version}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="aichat-polish-pick"
                      disabled={!pickable}
                      onClick={() => onAdoptCandidate(card.text)}
                    >
                      <span className="aichat-polish-card__text">
                        {card.text}
                        {!card.done && (
                          <span className="aichat-polish-card__cursor" aria-hidden>
                            ▍
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="aichat-polish-footer">
              <span className="aichat-polish-note">
                原文不会自动发送 · 草稿仅本次润色，未存档
              </span>
            </div>
          </div>
        )}

        {!showPolish && <div className="aichat-assist-section aichat-inferred">
          {inferredStep === "intent" && (
            <div className="aichat-intent-chips" role="tablist" aria-label="选择策略">
              {inferredIntents.map((intent, i) => {
                const selected = i === selectedInferredIndex;
                return (
                  <button
                    key={`${mol.id}-intent-${i}`}
                    type="button"
                    className={
                      selected
                        ? "aichat-intent-chip aichat-intent-chip--active"
                        : "aichat-intent-chip"
                    }
                    role="tab"
                    id={`mol-intent-tab-${i}`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onSelectInferredIntent(i)}
                  >
                    {intent.label}
                  </button>
                );
              })}
            </div>
          )}
          {inferredStep === "reply" && (
            <>
              <div className="aichat-inferred-step-head">
                {multiIntent && (
                  <button
                    type="button"
                    className="aichat-inferred-step-back"
                    onClick={onBackToInferredIntent}
                  >
                    返回
                  </button>
                )}
                <p className="aichat-inferred-lead" id="mol-intent-label">
                  {inferredIntentLabel}
                </p>
              </div>
              <ul
                className="aichat-assist-suggestions"
                aria-label={`「${inferredIntentLabel}」的成稿`}
                aria-describedby="mol-intent-label"
              >
                {contextReplyList.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className="aichat-sug-item aichat-sug-context"
                      onClick={() => onSelectContextReply(t)}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
              {loadMoreVisible && (
                <button type="button" className="aichat-load-more" onClick={onLoadMore}>
                  更多
                </button>
              )}
              {loadMoreDone && <p className="aichat-load-hint">没有更多了</p>}
            </>
          )}
        </div>}
      </div>
    </>
  );
}
