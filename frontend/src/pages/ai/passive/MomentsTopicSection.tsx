import { useState } from "react";
import { addQaFromTopic, isTopicCollected } from "../../../services/passiveCloneLocalStorage";
import type { PassiveTopic } from "../../../types/passiveClone";

type Props = {
  title: string;
  topics: PassiveTopic[];
  onCollected: () => void;
  variant?: "default" | "layered" | "ranked";
};

function rankNumClass(index: number): string {
  const rank = index + 1;
  if (rank <= 2) return "moments-hot-rank-num moments-hot-rank-num--hot";
  if (rank === 3) return "moments-hot-rank-num moments-hot-rank-num--warm";
  return "moments-hot-rank-num";
}

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

  function openTopic(id: string) {
    if (isTopicCollected(id)) return;
    setAnswerFor(id);
    setAnswerText("");
  }

  const layered = variant === "layered";
  const ranked = variant === "ranked";

  return (
    <section
      className={`moments-add-section${layered ? " moments-add-section--layered" : ""}${ranked ? " moments-add-section--ranked" : ""}`}
    >
      {title ? <h2 className="moments-add-section__title">{title}</h2> : null}
      {ranked ? (
        <ul className="moments-hot-rank-list" aria-label={title || "热门话题"}>
          {topics.map((t, index) => {
            const done = isTopicCollected(t.id);
            const content = (
              <>
                <span className={rankNumClass(index)} aria-hidden>
                  {index + 1}
                </span>
                <div className="moments-hot-rank-main">
                  <p className="moments-hot-rank-q">{t.question}</p>
                  {t.hint ? <p className="moments-hot-rank-hint">{t.hint}</p> : null}
                  {done ? <span className="moments-hot-tag-ok">已收录</span> : null}
                </div>
                {!done ? <span className="moments-hot-rank-arrow" aria-hidden>›</span> : null}
              </>
            );

            return (
              <li key={t.id}>
                {done ? (
                  <div className="moments-hot-rank-item moments-hot-rank-item--done">{content}</div>
                ) : (
                  <button type="button" className="moments-hot-rank-item" onClick={() => openTopic(t.id)}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
      <ul className="aichat-list" aria-label={title || "热门话题"}>
        {topics.map((t) => {
          const done = isTopicCollected(t.id);
          const cardClass = [
            "moments-add-topic-card",
            layered ? "moments-add-topic-card--layered" : "aichat-card aichat-page-card",
            done ? "moments-add-topic-card--done" : "moments-add-topic-card--clickable",
          ].join(" ");

          if (done) {
            return (
              <li key={t.id}>
                <div className={cardClass}>
                  <p className={layered ? "moments-add-topic-card__q" : "aichat-card-title"}>{t.question}</p>
                  {t.hint ? <p className={layered ? "moments-add-topic-card__hint" : "aichat-card-hint"}>{t.hint}</p> : null}
                  <span className={layered ? "moments-hot-tag-ok" : "aichat-tag-ok"}>已收录</span>
                </div>
              </li>
            );
          }

          return (
            <li key={t.id}>
              <button type="button" className={cardClass} onClick={() => openTopic(t.id)}>
                <p className={layered ? "moments-add-topic-card__q" : "aichat-card-title"}>{t.question}</p>
                {t.hint ? <p className={layered ? "moments-add-topic-card__hint" : "aichat-card-hint"}>{t.hint}</p> : null}
              </button>
            </li>
          );
        })}
      </ul>
      )}

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
          <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={`topic-q-${topic.id}`}>
            <p id={`topic-q-${topic.id}`} className="moments-topic-answer-form__q">
              {topic.question}
            </p>
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
            <div className="aichat-moldt-info-form__act moments-topic-answer-form__act">
              <button type="button" className="aichat-btn-primary aichat-btn-fit moments-topic-answer-form__submit" onClick={submitAnswer}>
                添加到我的朋友圈
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
