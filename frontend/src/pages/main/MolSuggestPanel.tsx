import { SUYAN } from "../../constants/suyanCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RelationType } from "../../constants/relationTypes";
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
  const [items, setItems] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [errCode, setErrCode] = useState("");
  const requestGenRef = useRef(0);

  const hasMol = Boolean(molId && molName);
  const hasRelation = Boolean(relationType);
  const canSuggest = hasMol || hasRelation;
  const useMolPath = hasMol;
  const resolveDraft = useCallback(() => {
    const fromGetter = getDraftText?.().trim() ?? "";
    if (fromGetter) return fromGetter;
    return draftText.trim();
  }, [draftText, getDraftText]);

  const buildLastMessages = useCallback(() => {
    return getLastMessages().slice(-12);
  }, [getLastMessages]);

  const load = useCallback(async () => {
    if (!canSuggest) return;

    const gen = ++requestGenRef.current;
    const draft = resolveDraft();
    setLoading(true);
    setErr("");
    setErrCode("");
    setItems([]);
    try {
      const lastMessages = buildLastMessages();
      if (useMolPath) {
        const { suggestions } = await suggestRepliesApi(
          peerUserId,
          lastMessages,
          molId ?? undefined,
          draft || undefined,
        );
        if (gen !== requestGenRef.current) return;
        setItems(suggestions.slice(0, 3));
      } else if (hasRelation) {
        const { suggestions } = await suggestRepliesByRelationApi(peerUserId, lastMessages, draft || undefined);
        if (gen !== requestGenRef.current) return;
        setItems(suggestions.slice(0, 3));
      }
    } catch (e: unknown) {
      if (gen !== requestGenRef.current) return;
      const mapped = mapSuggestError(e);
      setErr(mapped.msg);
      setErrCode(mapped.code);
    } finally {
      if (gen === requestGenRef.current) {
        setLoading(false);
      }
    }
  }, [buildLastMessages, canSuggest, hasRelation, molId, peerUserId, resolveDraft, useMolPath]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!open) {
      requestGenRef.current += 1;
      setLoading(false);
      setItems([]);
      setErr("");
      setErrCode("");
      return;
    }
    if (!canSuggest) return;
    queueMicrotask(() => {
      void loadRef.current();
    });
  }, [open, canSuggest, peerUserId]);

  const draft = resolveDraft();

  if (!open) return null;

  const showSuggestions = canSuggest && !loading && !err && items.length > 0;
  const showEmptySuggest = canSuggest && !loading && !err && items.length === 0;
  const showFoot = canSuggest && !err && !loading;

  return (
    <div className="mol-composer-panel" role="region" aria-label={SUYAN.suggest}>
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
                设置关系
              </button>
              或
            </>
          ) : (
            "设置关系或"
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

      {canSuggest && loading ? (
        <p className="mol-composer-status">生成中…</p>
      ) : canSuggest && err ? (
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
      ) : showSuggestions ? (
        <ul className="mol-composer-suggest" aria-label="回复建议">
          {items.map((text, i) => (
            <li key={`${i}-${text.slice(0, 12)}`}>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onPick(text);
                  onClose();
                }}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showFoot ? (
        <div className="mol-composer-foot">
          <button
            type="button"
            className="mol-composer-foot__refresh"
            disabled={loading}
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
