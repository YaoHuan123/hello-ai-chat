import { useState } from "react";
import { addQaFromTopic, isTopicCollected } from "../../../services/passiveCloneLocalStorage";
import type { PassiveTopic } from "../../../types/passiveClone";

type Props = {
  title: string;
  topics: PassiveTopic[];
  onCollected: () => void;
  variant?: "default" | "layered";
};

export function MomentsTopicSection({ title, topics, onCollected, variant = "default" }: Props) {
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  const topic = answerFor ? topics.find((t) => t.id === answerFor) : null;

  function submitAnswer() {
    if (!topic || !answerText.trim()) {
      window.alert("请填写回答。");
      return;
    }
    if (isTopicCollected(topic.id)) {
      window.alert("该问题已收录。");
      return;
    }
    addQaFromTopic(topic.id, topic.question, answerText.trim());
    setAnswerFor(null);
    setAnswerText("");
    onCollected();
  }

  const layered = variant === "layered";

  return (
    <section className={`moments-add-section${layered ? " moments-add-section--layered" : ""}`}>
      {title ? <h2 className="moments-add-section__title">{title}</h2> : null}
      <ul className="aichat-list" aria-label={title || "热门话题"}>
        {topics.map((t) => {
          const done = isTopicCollected(t.id);
          return (
            <li key={t.id}>
              <div className={`moments-add-topic-card${layered ? " moments-add-topic-card--layered" : " aichat-card aichat-page-card"}`}>
                <p className={layered ? "moments-add-topic-card__q" : "aichat-card-title"}>{t.question}</p>
                {t.hint && <p className={layered ? "moments-add-topic-card__hint" : "aichat-card-hint"}>{t.hint}</p>}
                <div className="moments-add-topic-card__act">
                  {done ? (
                    <span className={layered ? "moments-hot-tag-ok" : "aichat-tag-ok"}>已收录</span>
                  ) : layered ? (
                    <button type="button" className="moments-hot-answer-btn" onClick={() => setAnswerFor(t.id)}>
                      回答
                    </button>
                  ) : (
                    <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={() => setAnswerFor(t.id)}>
                      回答
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {topic && (
        <div
          className="aichat-moldt-info-back"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAnswerFor(null);
              setAnswerText("");
            }
          }}
        >
          <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h4 className="aichat-moldt-info-form__h">回答</h4>
            <p style={{ fontSize: 14, margin: "0 0 8px", color: "var(--aichat-muted)" }}>{topic.question}</p>
            <label className="aichat-moldt-info-form__lab" htmlFor={`topic-ans-${topic.id}`}>
              你的回答
            </label>
            <textarea
              id={`topic-ans-${topic.id}`}
              className="aichat-textarea"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <div className="aichat-moldt-info-form__act">
              <button
                type="button"
                className="aichat-btn-ghost"
                onClick={() => {
                  setAnswerFor(null);
                  setAnswerText("");
                }}
              >
                取消
              </button>
              <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={submitAnswer}>
                发布
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
