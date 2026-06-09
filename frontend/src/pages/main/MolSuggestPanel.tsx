import { useCallback, useEffect, useState } from "react";
import { suggestRepliesApi, type MolSuggestLastMessage } from "../../services/molSuggestApi";

type Props = {
  open: boolean;
  peerUserId: string;
  getLastMessages: () => MolSuggestLastMessage[];
  onClose: () => void;
  onAdopt: (text: string) => void;
  /** 前往「我的 Mol」管理资料；未传则不显示入口 */
  onManageMols?: () => void;
};

export function MolSuggestPanel({ open, peerUserId, getLastMessages, onClose, onAdopt, onManageMols }: Props) {
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
      const { suggestions } = await suggestRepliesApi(peerUserId, lastMessages);
      setItems(suggestions.slice(0, 3));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      let code = "";
      if (msg.includes("尚未添加") && msg.includes("Mol")) code = "NO_USER_MOLS";
      else if (msg.includes("AI 服务未配置")) code = "AI_NOT_CONFIGURED";
      else if (msg.includes("不是联系人")) code = "NOT_FRIENDS";
      setErrCode(code);
    } finally {
      setLoading(false);
    }
  }, [getLastMessages, peerUserId]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void load();
    });
  }, [open, load]);

  if (!open) return null;

  return (
    <div className="msg-suggest-panel aichat-card" role="dialog" aria-modal="true" aria-labelledby="mol-suggest-title">
      <div className="msg-suggest-panel__head">
        <h2 id="mol-suggest-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          Mol 建议
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="aichat-btn-ghost" disabled={loading} onClick={() => void load()}>
            刷新
          </button>
          <button type="button" className="aichat-btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      {onManageMols ? (
        <div className="msg-suggest-panel__mol-row">
          <p className="msg-suggest-panel__mol-hint">建议基于「我的 Mol」中的资料</p>
          <button type="button" className="msg-suggest-panel__mol-btn" onClick={onManageMols}>
            修改 Mol
          </button>
        </div>
      ) : null}
      {loading ? (
        <p className="aichat-muted-line" style={{ margin: "12px 0" }}>
          生成中…
        </p>
      ) : err ? (
        <div style={{ marginTop: 8 }}>
          <p className="aichat-form-msg err" style={{ margin: 0 }}>
            {err}
          </p>
          {errCode === "NO_USER_MOLS" ? (
            <p className="aichat-muted-line" style={{ margin: "10px 0 0", fontSize: 13 }}>
              请先在「我的 Mol」里添加至少一个。
            </p>
          ) : null}
          {errCode === "AI_NOT_CONFIGURED" ? (
            <p className="aichat-muted-line" style={{ margin: "10px 0 0", fontSize: 13 }}>
              请在服务端配置 OPENAI_API_KEY 等环境变量。
            </p>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <p className="aichat-muted-line" style={{ margin: "12px 0" }}>
          暂无建议
        </p>
      ) : (
        <ul className="msg-suggest-list" style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
          {items.map((text, i) => (
            <li key={`${i}-${text.slice(0, 12)}`} className="msg-suggest-item">
              <button type="button" className="msg-suggest-item__btn" onClick={() => onAdopt(text)}>
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
