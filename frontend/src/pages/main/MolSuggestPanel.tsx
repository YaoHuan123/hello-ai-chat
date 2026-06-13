import { SUYAN } from "../../constants/suyanCopy";
import { useCallback, useEffect, useState } from "react";
import { relationLabel, type RelationType } from "../../constants/relationTypes";
import { suggestRepliesApi, type MolSuggestLastMessage } from "../../services/molSuggestApi";
import { RelationTag } from "../../components/RelationTag";

type Props = {
  open: boolean;
  peerUserId: string;
  molId: string | null;
  molName: string | null;
  relationType?: RelationType | null;
  getLastMessages: () => MolSuggestLastMessage[];
  draftText?: string;
  onPick: (text: string) => void;
  onClose: () => void;
  onManageMols?: () => void;
};

export function MolSuggestPanel({
  open,
  peerUserId,
  molId,
  molName,
  relationType = null,
  getLastMessages,
  draftText = "",
  onPick,
  onClose,
  onManageMols,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [errCode, setErrCode] = useState("");

  const hasMol = Boolean(molId && molName);

  const load = useCallback(async () => {
    if (!molId) return;
    setLoading(true);
    setErr("");
    setErrCode("");
    setItems([]);
    try {
      let lastMessages = getLastMessages().slice(-12);
      const draft = draftText.trim();
      if (draft) {
        lastMessages = [...lastMessages, { from: "me", text: draft, ts: Date.now() }];
      }
      const { suggestions } = await suggestRepliesApi(peerUserId, lastMessages, molId);
      setItems(suggestions.slice(0, 3));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      let code = "";
      if (msg.includes("尚未添加")) code = "NO_USER_MOLS";
      else if (msg.includes("资料为空")) code = "MOL_PERSONA_EMPTY";
      else if (msg.includes("AI 服务未配置")) code = "AI_NOT_CONFIGURED";
      else if (msg.includes("不是联系人")) code = "NOT_FRIENDS";
      setErrCode(code);
    } finally {
      setLoading(false);
    }
  }, [draftText, getLastMessages, molId, peerUserId]);

  useEffect(() => {
    if (!open || !hasMol) return;
    queueMicrotask(() => {
      void load();
    });
  }, [open, hasMol, draftText, load]);

  if (!open) return null;

  const draft = draftText.trim();
  const rel = relationLabel(relationType);

  return (
    <div className="mol-composer-panel" role="region" aria-label={SUYAN.suggest}>
      {draft ? (
        <div className="mol-composer-draft" aria-label="待发送内容">
          <p className="mol-composer-draft__text">{draft}</p>
        </div>
      ) : null}

      {!hasMol ? (
        <p className="mol-composer-hint">
          还没有{SUYAN.name}，
          {onManageMols ? (
            <button type="button" className="mol-composer-hint-link" onClick={onManageMols}>
              去添加
            </button>
          ) : (
            "请先添加"
          )}
        </p>
      ) : (
        <div className="mol-composer-context">
          {relationType ? <RelationTag type={relationType} /> : null}
          {rel && molName ? (
            <span className="mol-composer-context__text">
              {relationType ? " · " : ""}
              {SUYAN.name}：{molName}
            </span>
          ) : null}
        </div>
      )}

      {hasMol && loading ? (
        <p className="mol-composer-status">生成中…</p>
      ) : hasMol && err ? (
        <div className="mol-composer-status-block">
          <p className="mol-composer-status mol-composer-status--err">{err}</p>
          {errCode === "NO_USER_MOLS" ? (
            <p className="mol-composer-status">{SUYAN.myListHint}</p>
          ) : null}
          {errCode === "MOL_PERSONA_EMPTY" ? (
            <p className="mol-composer-status">{SUYAN.switchHint}</p>
          ) : null}
          {errCode === "AI_NOT_CONFIGURED" ? (
            <p className="mol-composer-status">请在服务端配置 OPENAI_API_KEY 等环境变量。</p>
          ) : null}
        </div>
      ) : hasMol && items.length === 0 ? (
        <p className="mol-composer-status">暂无建议</p>
      ) : hasMol ? (
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

      {hasMol && !err ? (
        <div className="mol-composer-foot">
          <span className="mol-composer-foot__hint">基于关系与聊天上下文生成</span>
          <button type="button" disabled={loading} onClick={() => void load()}>
            换一批
          </button>
        </div>
      ) : null}
    </div>
  );
}
