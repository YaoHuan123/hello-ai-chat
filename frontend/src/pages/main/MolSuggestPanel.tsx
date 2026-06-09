import { useCallback, useEffect, useState } from "react";
import { suggestRepliesApi, type MolSuggestLastMessage } from "../../services/molSuggestApi";

type Props = {
  open: boolean;
  peerUserId: string;
  molId: string;
  molName: string;
  getLastMessages: () => MolSuggestLastMessage[];
  onAdopt: (text: string) => void;
  onSwitchMol: () => void;
};

export function MolSuggestPanel({
  open,
  peerUserId,
  molId,
  molName,
  getLastMessages,
  onAdopt,
  onSwitchMol,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [errCode, setErrCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    setErrCode("");
    setItems([]);
    try {
      const lastMessages = getLastMessages().slice(-12);
      const { suggestions } = await suggestRepliesApi(peerUserId, lastMessages, molId);
      setItems(suggestions.slice(0, 3));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      let code = "";
      if (msg.includes("尚未添加") && msg.includes("Mol")) code = "NO_USER_MOLS";
      else if (msg.includes("资料为空")) code = "MOL_PERSONA_EMPTY";
      else if (msg.includes("AI 服务未配置")) code = "AI_NOT_CONFIGURED";
      else if (msg.includes("不是联系人")) code = "NOT_FRIENDS";
      setErrCode(code);
    } finally {
      setLoading(false);
    }
  }, [getLastMessages, molId, peerUserId]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void load();
    });
  }, [open, load]);

  return (
    <div className="msg-suggest-inline" role="region" aria-label="Mol 建议">
      {loading ? (
        <p className="msg-suggest-inline__status">生成中…</p>
      ) : err ? (
        <div className="msg-suggest-inline__status-block">
          <p className="aichat-form-msg err" style={{ margin: 0 }}>
            {err}
          </p>
          {errCode === "NO_USER_MOLS" ? (
            <p className="msg-suggest-inline__status">请先在「我的 Mol」里添加至少一个。</p>
          ) : null}
          {errCode === "MOL_PERSONA_EMPTY" ? (
            <p className="msg-suggest-inline__status">请切换 Mol 或补充资料条目后再试。</p>
          ) : null}
          {errCode === "AI_NOT_CONFIGURED" ? (
            <p className="msg-suggest-inline__status">请在服务端配置 OPENAI_API_KEY 等环境变量。</p>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <p className="msg-suggest-inline__status">暂无建议</p>
      ) : (
        <div className="msg-suggest-inline__suggestions">
          {items.map((text, i) => (
            <button key={`${i}-${text.slice(0, 12)}`} type="button" className="msg-suggest-inline__suggest-item" onClick={() => onAdopt(text)}>
              {text}
            </button>
          ))}
        </div>
      )}
      <div className="msg-suggest-inline__footer">
        <button type="button" className="msg-suggest-inline__mol-pick" onClick={onSwitchMol} aria-label={`重新选择 Mol，当前 ${molName}`}>
          {molName}
        </button>
        <button type="button" className="msg-suggest-inline__refresh" disabled={loading} onClick={() => void load()}>
          刷新
        </button>
      </div>
    </div>
  );
}
