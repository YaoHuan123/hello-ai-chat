import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SUYAN } from "../constants/suyanCopy";
import { getMolById, MOL_LIST, type MolProfile } from "../data/molMock";
import {
  mockPolishVariants,
  streamText,
  type PolishTone,
  type StreamHandle,
} from "../data/polishMock";
import { MolAssistPanel, type PolishUiCandidate } from "./assisted/MolAssistPanel";
import { MolSwitchModal } from "./assisted/MolSwitchModal";
import { useInferredOutputFlow } from "./assisted/useInferredOutputFlow";

type Msg = { id: string; from: "other" | "me"; text: string; time: string };

const seed: Msg[] = [
  { id: "1", from: "other", time: "10:00", text: "下午有空吗？想聊聊项目合作的事。" },
  { id: "2", from: "me", time: "10:01", text: "我先看下日程，晚点回复你。" },
  { id: "3", from: "other", time: "10:05", text: "好的，尽量快一点，这个项目比较急。" },
];

function nextId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const nowTime = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

type Props = { onBack: () => void };

export function AssistedChatPage({ onBack }: Props) {
  const titleId = useId();
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [molId, setMolId] = useState(MOL_LIST[0].id);
  const [panelOpen, setPanelOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [moreLoaded, setMoreLoaded] = useState<Record<string, boolean>>({});
  const inferredFlow = useInferredOutputFlow(0);
  const scRef = useRef<HTMLDivElement>(null);

  const mol: MolProfile = getMolById(molId);
  const activeInferred =
    mol.inferredIntents[inferredFlow.selectedIntentIndex] ?? mol.inferredIntents[0];
  const moreKey = `${molId}::${inferredFlow.selectedIntentIndex}`;
  const moreUsed = Boolean(moreLoaded[moreKey]);
  const contextReplyList = [
    ...activeInferred.defaultReplies,
    ...(moreUsed ? activeInferred.moreReplies : []),
  ];
  const { moreReplies } = activeInferred;
  const loadMoreVisible = moreReplies.length > 0 && !moreUsed;
  const loadMoreDone = moreReplies.length > 0 && moreUsed;

  // === 润色状态 ===
  const [polishTone, setPolishTone] = useState<PolishTone>("recommended");
  const [polishDraft, setPolishDraft] = useState("");
  const [polishCards, setPolishCards] = useState<PolishUiCandidate[]>([]);
  const [polishLoading, setPolishLoading] = useState(false);

  const polishCancelRef = useRef<StreamHandle>({ cancelled: false });
  const polishCacheRef = useRef<Map<string, PolishUiCandidate[]>>(new Map());

  const showPolish = polishLoading || polishCards.length > 0;
  const polishStale =
    polishCards.length > 0 && polishDraft.trim() !== input.trim();

  const scrollToBottom = useCallback(() => {
    const el = scRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(
    () => () => {
      polishCancelRef.current.cancelled = true;
    },
    [],
  );

  function cancelPolish() {
    polishCancelRef.current.cancelled = true;
    polishCancelRef.current = { cancelled: false };
    setPolishLoading(false);
    setPolishCards((prev) => prev.map((c) => ({ ...c, done: true })));
  }

  function startPolish(draftValue: string, tone: PolishTone, molIdValue: string, seedNum = 0) {
    polishCancelRef.current.cancelled = true;
    polishCancelRef.current = { cancelled: false };

    const trimmed = draftValue.trim();
    if (!trimmed) {
      setPolishCards([]);
      setPolishLoading(false);
      return;
    }

    setPolishDraft(draftValue);

    const key = `${tone}::${trimmed}::${seedNum}`;
    const cached = polishCacheRef.current.get(key);
    if (cached) {
      setPolishCards(cached.map((c) => ({ ...c, done: true, fromCache: true })));
      setPolishLoading(false);
      return;
    }

    const variants = mockPolishVariants(draftValue, tone, molIdValue, seedNum);
    const initial: PolishUiCandidate[] = variants.map((v, i) => ({
      id: `card-${i}`,
      tag: v.tag,
      text: "",
      done: false,
      version: 1,
      fromCache: false,
    }));
    setPolishCards(initial);
    setPolishLoading(true);

    const handle = polishCancelRef.current;
    let doneCount = 0;
    variants.forEach((v, i) => {
      streamText(
        v.text,
        (sofar, done) => {
          setPolishCards((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], text: sofar, done };
            return next;
          });
          if (done) {
            doneCount += 1;
            if (doneCount === variants.length) {
              setPolishCards((prev) => {
                polishCacheRef.current.set(
                  key,
                  prev.map((c) => ({ ...c, fromCache: false })),
                );
                return prev;
              });
              setPolishLoading(false);
            }
          }
        },
        handle,
      );
    });
  }

  function regenerateAll() {
    const seedNum = (Date.now() % 1000) + 1;
    startPolish(input, polishTone, molId, seedNum);
  }

  function onChangeTone(t: PolishTone) {
    if (t === polishTone) return;
    setPolishTone(t);
    startPolish(input, t, molId, 0);
  }

  function ensurePolishStarted(draftValue: string) {
    if (!draftValue.trim()) return;
    if (polishLoading) return;
    if (polishCards.length > 0 && polishDraft.trim() === draftValue.trim()) return;
    startPolish(draftValue, polishTone, molId, 0);
  }

  function onAdoptCandidate(text: string) {
    sendMine(text);
  }

  function sendMine(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), from: "me", text: text.trim(), time: nowTime() },
    ]);
    setInput("");
    setPanelOpen(false);
    cancelPolish();
    setPolishCards([]);
    setPolishDraft("");
  }

  function onSendClick() {
    sendMine(input);
  }

  function onInputChange(v: string) {
    setInput(v);
    if (polishLoading) {
      cancelPolish();
    }
  }

  function onSelectContextReply(text: string) {
    setInput(text);
    setPanelOpen(false);
    inferredFlow.onReplySelected();
  }

  function onLoadMore() {
    setMoreLoaded((s) => ({ ...s, [moreKey]: true }));
  }

  function onPolishClick() {
    if (!input.trim()) return;
    setPanelOpen(true);
    ensurePolishStarted(input);
  }

  function onOpenAssistPanel() {
    setPanelOpen((v) => {
      const next = !v;
      if (next) {
        inferredFlow.openPanel();
      }
      return next;
    });
  }

  function onSelectInferredIntent(index: number) {
    inferredFlow.selectIntent(index);
  }

  // 通过 ref 让快捷键回调始终拿到最新闭包，而不是反复重绑监听器。
  const polishClickRef = useRef<() => void>(() => {});
  useEffect(() => {
    polishClickRef.current = onPolishClick;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        polishClickRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="aichat-assist" aria-labelledby={titleId}>
      <header className="aichat-assist-nav">
        <button type="button" className="aichat-assist-back" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="aichat-assist-titles">
          <h1 id={titleId} className="aichat-assist-name">
            张三
          </h1>
          <p className="aichat-assist-sub">{SUYAN.assistChatSub}</p>
        </div>
        <div className="aichat-assist-nav-pad" aria-hidden />
      </header>

      <div className="aichat-assist-messages" ref={scRef}>
        <p className="aichat-msg-time">10:00</p>
        {messages.map((msg) => (
          <div key={msg.id} className={`aichat-msg ${msg.from === "me" ? "mine" : "other"}`}>
            {msg.from === "other" && (
              <img
                className="aichat-ava"
                src="https://ui-avatars.com/api/?name=Z&size=80&background=7d7d7d&color=fff"
                alt=""
              />
            )}
            <p className="aichat-bub">{msg.text}</p>
            {msg.from === "me" && (
              <img
                className="aichat-ava"
                src="https://ui-avatars.com/api/?name=Me&size=80&background=007aff&color=fff"
                alt=""
              />
            )}
          </div>
        ))}
      </div>

      <div className="aichat-assist-inputrow">
        <input
          className="aichat-assist-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="先写一句，或点浮标接话"
        />
        <button
          type="button"
          className="aichat-input-polish"
          onClick={onPolishClick}
          disabled={!input.trim()}
          title={input.trim() ? "润色（Ctrl/Cmd + J）" : `先写一句，再让${SUYAN.name}润色`}
          aria-label={SUYAN.polishFor}
        >
          ✨
        </button>
        <button
          type="button"
          className="aichat-assist-send"
          onClick={onSendClick}
          disabled={!input.trim()}
        >
          发送
        </button>
      </div>

      <button
        type="button"
        className="aichat-mol-float"
        onClick={onOpenAssistPanel}
        title={SUYAN.openSuggest}
        aria-pressed={panelOpen}
        aria-label={`打开或关闭${SUYAN.name}推荐面板`}
      >
        <img src={mol.avatar} className="aichat-mol-float-img" alt="" width={50} height={50} />
      </button>

      <MolAssistPanel
        key={molId}
        open={panelOpen}
        mol={mol}
        inferredIntents={mol.inferredIntents}
        selectedInferredIndex={inferredFlow.selectedIntentIndex}
        inferredStep={inferredFlow.step}
        onSelectInferredIntent={onSelectInferredIntent}
        onBackToInferredIntent={inferredFlow.backToIntent}
        inferredIntentLabel={activeInferred.label}
        contextReplyList={contextReplyList}
        onSelectContextReply={onSelectContextReply}
        showPolish={showPolish}
        polishDraft={polishDraft}
        polishTone={polishTone}
        polishCandidates={polishCards}
        polishStale={polishStale}
        onChangeTone={onChangeTone}
        onAdoptCandidate={onAdoptCandidate}
        onRegenerateAll={regenerateAll}
        onSwitch={() => setSwitchOpen(true)}
        onClose={() => {
          setPanelOpen(false);
          inferredFlow.closePanel();
        }}
        onLoadMore={onLoadMore}
        loadMoreVisible={loadMoreVisible}
        loadMoreDone={loadMoreDone}
      />

      {switchOpen && (
        <MolSwitchModal
          key={molId}
          mols={MOL_LIST}
          currentId={molId}
          onClose={() => setSwitchOpen(false)}
          onConfirm={(id) => {
            cancelPolish();
            polishCacheRef.current.clear();
            setPolishCards([]);
            setPolishDraft("");
            setMolId(id);
            inferredFlow.resetForMol();
          }}
        />
      )}
    </div>
  );
}
