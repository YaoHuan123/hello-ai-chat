import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "../../components/AppIcons";
import { YiyiAvatar } from "../../components/YiyiAvatar";
import { useChatViewportScroll } from "../../hooks/useChatViewportScroll";
import { loadYiyiState, pickYiyiTopic, refreshYiyiTopics, sendYiyiChat } from "../../services/yiyiClient";
import type { YiyiChatMessage } from "../../types/yiyi";

type Props = {
  onBack: () => void;
};

const INPUT_PLACEHOLDER = "回答 YiYi 的问题，或直接说说你的想法。";
const INPUT_MAX_HEIGHT = 120;

export function YiyiChatPage({ onBack }: Props) {
  const [messages, setMessages] = useState<YiyiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshingTopics, setRefreshingTopics] = useState(false);
  const refreshLockRef = useRef(false);
  const scRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useChatViewportScroll(scRef);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiState()
      .then((s) => setMessages(s.ownerChat))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const syncInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    syncInputHeight();
  }, [input, syncInputHeight]);

  useEffect(() => {
    const el = scRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setErr("");
    try {
      const result = await sendYiyiChat(trimmed);
      setMessages(result.state.ownerChat);
      setInput("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function onPickTopic(topic: string, sourceMessageId: string) {
    if (sending) return;
    setSending(true);
    setErr("");
    try {
      const result = await pickYiyiTopic(topic, sourceMessageId);
      setMessages(result.state.ownerChat);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function onRefreshTopics() {
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    setRefreshingTopics(true);
    setErr("");
    try {
      const result = await refreshYiyiTopics();
      setMessages(result.state.ownerChat);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      refreshLockRef.current = false;
      setRefreshingTopics(false);
    }
  }

  return (
    <div className="aichat-shell yiyi-subpage yiyi-chat-shell">
      <header className="aichat-topbar aichat-topbar-flex yiyi-subpage__topbar">
        <button type="button" className="aichat-btn-ghost" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>YiYi</h1>
        </div>
        <span className="yiyi-tab__topbar-spacer" aria-hidden />
      </header>

      <div className="yiyi-chat-msgs" ref={scRef}>
        <p className="yiyi-chat-banner">YiYi 是你的中间人。多聊几句，我会更了解如何代表你。</p>
        {err ? <p className="aichat-form-msg err yiyi-chat-error">{err}</p> : null}
        {loading && messages.length === 0 ? <p className="yiyi-empty yiyi-chat-empty">加载中…</p> : null}

        {messages.map((m) =>
          m.from === "me" ? (
            <div key={m.id} className="yiyi-chat-row yiyi-chat-row--me">
              <div className="yiyi-chat-bubble yiyi-chat-bubble--me">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className="yiyi-chat-row">
              <YiyiAvatar className="yiyi-avatar yiyi-avatar--sm" />
              <div className="yiyi-chat-yiyi-block">
                <div className="yiyi-chat-bubble yiyi-chat-bubble--yiyi">{m.text}</div>
                {m.topics && m.topics.length > 0 ? (
                  <div className="yiyi-chat-topics">
                    <div className="yiyi-chat-topics__head">
                      <span>推荐问题</span>
                      <button
                        type="button"
                        className="yiyi-chat-topics__refresh"
                        onClick={() => void onRefreshTopics()}
                        disabled={refreshingTopics}
                        aria-busy={refreshingTopics}
                      >
                        <AppIcon name="refresh" className={`app-icon app-icon--xs${refreshingTopics ? " app-icon--spin" : ""}`} />
                        {refreshingTopics ? "加载中" : "换一批"}
                      </button>
                    </div>
                    <div className="yiyi-chat-topics__chips">
                      {m.topics.map((topic) => (
                        <button key={topic} type="button" className="yiyi-topic-chip" disabled={sending || refreshingTopics} onClick={() => void onPickTopic(topic, m.id)}>
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="yiyi-chat-composer">
        <div className="yiyi-chat-composer__row">
          <button
            type="button"
            className="yiyi-chat-composer__refresh"
            onClick={() => void onRefreshTopics()}
            disabled={refreshingTopics}
            aria-label={refreshingTopics ? "推荐问题加载中" : "刷新推荐问题"}
            aria-busy={refreshingTopics}
          >
            <AppIcon name="refresh" className={`app-icon app-icon--sm${refreshingTopics ? " app-icon--spin" : ""}`} />
          </button>
          <textarea
            ref={inputRef}
            className="yiyi-chat-composer__input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={INPUT_PLACEHOLDER}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend(input);
              }
            }}
          />
          <button type="button" className="yiyi-chat-composer__send" disabled={!input.trim() || sending} onClick={() => void onSend(input)} aria-label="发送">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
