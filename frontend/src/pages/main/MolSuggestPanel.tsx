import { SUYAN } from "../../constants/suyanCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RelationType } from "../../constants/relationTypes";
import { streamText, type StreamHandle } from "../../data/polishMock";
import { pickSuggestChatContext } from "../../lib/suggestChatContext";
import { suggestRepliesApi, type MolSuggestLastMessage } from "../../services/molSuggestApi";
import { suggestRepliesByRelationApi } from "../../services/relationSuggestApi";
import { RelationTag } from "../../components/RelationTag";
import { AppIcon } from "../../components/AppIcons";

type Props = {
  open: boolean;
  peerUserId: string;
  molId: string | null;
  molName: string | null;
  relationType?: RelationType | null;
  getLastMessages: () => MolSuggestLastMessage[];
  draftText?: string;
  getDraftText?: () => string;
  onPick: (text: string) => void;
  onClose: () => void;
  onManageMols?: () => void;
  onSetRelation?: () => void;
};

type SuggestSlot = {
  id: string;
  fullText: string;
  displayText: string;
  done: boolean;
  streaming: boolean;
};

function mapSuggestError(e: unknown): { msg: string; code: string } {
  const msg = e instanceof Error ? e.message : String(e);
  let code = "";
  if (msg.includes("尚未添加")) code = "NO_USER_MOLS";
  else if (msg.includes("尚未设置关系")) code = "NO_RELATION";
  else if (msg.includes("资料为空")) code = "MOL_PERSONA_EMPTY";
  else if (msg.includes("AI 服务未配置")) code = "AI_NOT_CONFIGURED";
  else if (msg.includes("不是联系人")) code = "NOT_FRIENDS";
  else if (msg.includes("超时")) code = "AI_TIMEOUT";
  return { msg, code };
}

export function MolSuggestPanel({
  open,
  peerUserId,
  molId,
  molName,
  relationType = null,
  getLastMessages,
  draftText = "",
  getDraftText,
  onPick,
  onClose,
  onManageMols,
  onSetRelation,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<SuggestSlot[]>([]);
  const [err, setErr] = useState("");
  const [errCode, setErrCode] = useState("");
  const requestGenRef = useRef(0);
  const streamGenRef = useRef(0);
  const streamHandleRef = useRef<StreamHandle>({ cancelled: false });

  const hasMol = Boolean(molId && molName);
  const hasRelation = Boolean(relationType);
  const canSuggest = hasMol || hasRelation;
  const useMolPath = hasMol;

  const cancelStream = useCallback(() => {
    streamHandleRef.current.cancelled = true;
    streamGenRef.current += 1;
  }, []);

  const resolveDraft = useCallback(() => {
    const fromGetter = getDraftText?.().trim() ?? "";
    if (fromGetter) return fromGetter;
    return draftText.trim();
  }, [draftText, getDraftText]);

  const buildLastMessages = useCallback(() => {
    return pickSuggestChatContext(getLastMessages());
  }, [getLastMessages]);

  const startSequentialStream = useCallback((texts: string[], requestGen: number) => {
    cancelStream();
    const streamGen = streamGenRef.current;
    const handle: StreamHandle = { cancelled: false };
    streamHandleRef.current = handle;

    setSlots(
      texts.map((fullText, i) => ({
        id: `${requestGen}-${i}`,
        fullText,
        displayText: "",
        done: false,
        streaming: false,
      })),
    );

    const runSlot = (idx: number) => {
      if (handle.cancelled || streamGen !== streamGenRef.current) return;
      const full = texts[idx];
      if (!full) return;

      setSlots((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, streaming: true } : s)),
      );

      streamText(full, (sofar, done) => {
        if (handle.cancelled || streamGen !== streamGenRef.current) return;
        setSlots((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, displayText: sofar, done, streaming: !done } : s,
          ),
        );
        if (done && idx + 1 < texts.length) {
          window.setTimeout(() => runSlot(idx + 1), 220);
        }
      }, handle);
    };

    runSlot(0);
  }, [cancelStream]);

  const load = useCallback(async () => {
    if (!canSuggest) return;

    const gen = ++requestGenRef.current;
    const draft = resolveDraft();
    cancelStream();
    setLoading(true);
    setErr("");
    setErrCode("");
    setSlots([]);
    try {
      const lastMessages = buildLastMessages();
      let suggestions: string[] = [];
      if (useMolPath) {
        const res = await suggestRepliesApi(
          peerUserId,
          lastMessages,
          molId ?? undefined,
          draft || undefined,
        );
        suggestions = res.suggestions;
      } else if (hasRelation) {
        const res = await suggestRepliesByRelationApi(peerUserId, lastMessages, draft || undefined);
        suggestions = res.suggestions;
      }
      if (gen !== requestGenRef.current) return;
      const texts = suggestions.slice(0, 3);
      setLoading(false);
      if (texts.length > 0) {
        startSequentialStream(texts, gen);
      }
    } catch (e: unknown) {
      if (gen !== requestGenRef.current) return;
      const mapped = mapSuggestError(e);
      setErr(mapped.msg);
      setErrCode(mapped.code);
      setLoading(false);
    }
  }, [
    buildLastMessages,
    cancelStream,
    canSuggest,
    hasRelation,
    molId,
    peerUserId,
    resolveDraft,
    startSequentialStream,
    useMolPath,
  ]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!open) {
      requestGenRef.current += 1;
      cancelStream();
      setLoading(false);
      setSlots([]);
      setErr("");
      setErrCode("");
      return;
    }
    if (!canSuggest) return;
    queueMicrotask(() => {
      void loadRef.current();
    });
  }, [open, canSuggest, peerUserId, cancelStream]);

  useEffect(() => () => cancelStream(), [cancelStream]);

  const draft = resolveDraft();

  if (!open) return null;

  const showEmptySuggest = canSuggest && !loading && !err && slots.length === 0;
  const showSlots = canSuggest && !err && (loading || slots.length > 0);
  const streamBusy = slots.some((s) => !s.done);
  const showFoot = canSuggest && !err && (loading || slots.length > 0);

  return (
    <div
      className="mol-composer-panel mol-composer-panel--stream-d"
      role="region"
      aria-label={SUYAN.suggest}
    >
      {draft ? (
        <button
          type="button"
          className="mol-composer-draft"
          aria-label="发送原始回复"
          onClick={() => {
            onPick(draft);
            onClose();
          }}
        >
          <span className="mol-composer-draft__text">{draft}</span>
        </button>
      ) : null}

      {!canSuggest ? (
        <p className="mol-composer-hint">
          请先
          {onSetRelation ? (
            <>
              <button type="button" className="mol-composer-hint-link" onClick={onSetRelation}>
                设置你们的关系
              </button>
              或
            </>
          ) : (
            "设置你们的关系或"
          )}
          {onManageMols ? (
            <button type="button" className="mol-composer-hint-link" onClick={onManageMols}>
              添加{SUYAN.name}
            </button>
          ) : (
            `添加${SUYAN.name}`
          )}
        </p>
      ) : (
        <div className="mol-composer-context">
          {relationType ? <RelationTag type={relationType} /> : null}
          {useMolPath && molName ? (
            <span className="mol-composer-context__text">
              {relationType ? " · " : ""}
              {SUYAN.name}：{molName}
            </span>
          ) : null}
        </div>
      )}

      {canSuggest && err ? (
        <div className="mol-composer-status-block">
          <p className="mol-composer-status mol-composer-status--err">{err}</p>
          {errCode === "NO_USER_MOLS" ? (
            <p className="mol-composer-status">{SUYAN.myListHint}</p>
          ) : null}
          {errCode === "NO_RELATION" ? (
            <p className="mol-composer-status">请先在聊天中设置与对方的关系。</p>
          ) : null}
          {errCode === "MOL_PERSONA_EMPTY" ? (
            <p className="mol-composer-status">{SUYAN.switchHint}</p>
          ) : null}
          {errCode === "AI_NOT_CONFIGURED" ? (
            <p className="mol-composer-status">请在服务端配置 OPENAI_API_KEY 等环境变量。</p>
          ) : null}
          {errCode === "AI_TIMEOUT" ? (
            <p className="mol-composer-status">请求超时，请点刷新重试。</p>
          ) : null}
        </div>
      ) : showEmptySuggest ? (
        <p className="mol-composer-status">暂无建议</p>
      ) : showSlots ? (
        <ul
          className="mol-composer-suggest"
          aria-label="回复建议"
          aria-busy={loading || streamBusy}
        >
          {loading && slots.length === 0
            ? [0, 1, 2].map((i) => (
                <li key={`placeholder-${i}`}>
                  <div className="mol-composer-suggest__placeholder" aria-hidden />
                </li>
              ))
            : slots.map((slot) => {
                const pickable = slot.done && slot.fullText.trim().length > 0;
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      className={`mol-composer-suggest__btn${
                        slot.streaming ? " mol-composer-suggest__btn--typing" : ""
                      }${slot.done ? " mol-composer-suggest__btn--done" : ""}`}
                      disabled={!pickable}
                      onClick={() => {
                        onPick(slot.fullText);
                        onClose();
                      }}
                    >
                      <span className="mol-composer-suggest__text">
                        {slot.displayText}
                        {slot.streaming ? (
                          <span className="mol-composer-suggest__cursor" aria-hidden>
                            ▍
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
        </ul>
      ) : null}

      {showFoot ? (
        <div className="mol-composer-foot">
          <button
            type="button"
            className="mol-composer-foot__refresh"
            disabled={loading || streamBusy}
            aria-label="刷新"
            onClick={() => void loadRef.current()}
          >
            <AppIcon name="refresh" className="app-icon app-icon--sm" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
