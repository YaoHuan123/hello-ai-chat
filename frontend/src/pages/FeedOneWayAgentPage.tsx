import { useEffect, useMemo, useState } from "react";
import { getFeedQuestions, submitFeedAnswer, type FeedQuestion } from "../services/stageApi";

type Props = { onBack: () => void };

export function FeedOneWayAgentPage({ onBack }: Props) {
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    getFeedQuestions()
      .then((res) => {
        setQuestions(res);
        const draft: Record<string, string> = {};
        res.forEach((q) => {
          draft[q.id] = q.answer ?? "";
        });
        setAnswers(draft);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(() => questions.filter((q) => q.answered).length, [questions]);

  async function onSubmit(q: FeedQuestion) {
    const answer = (answers[q.id] ?? "").trim();
    if (!answer || savingId) return;
    setSavingId(q.id);
    setErr("");
    try {
      const updated = await submitFeedAnswer(q.id, answer);
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? updated : item)));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>智能体喂养</h1>
          <p>按问题补全偏好</p>
        </div>
        <div className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main aichat-page-main">
        {err && <p className="aichat-form-msg err">{err}</p>}

        {!loading && (
          <div className="aichat-card aichat-progress-card">
            <p className="aichat-kpi-label">进度</p>
            <p className="aichat-kpi-value">{completed}/{questions.length}</p>
          </div>
        )}

        {loading ? (
          <div className="aichat-card">正在加载问题...</div>
        ) : (
          <div className="aichat-page-stack">
            {questions.map((q, i) => (
              <div key={q.id} className="aichat-card aichat-page-card">
                <div className="aichat-inline-row aichat-inline-row-between">
                  <h2 className="aichat-panel-title">问题 {i + 1}</h2>
                  {q.answered ? <span className="aichat-tag-ok">已保存</span> : <span className="aichat-tag-muted">待补全</span>}
                </div>
                <p className="aichat-card-title">{q.title}</p>
                <p className="aichat-card-hint">{q.hint}</p>
                <textarea
                  className="aichat-textarea"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="输入你的偏好规则"
                />
                <div className="aichat-inline-row aichat-inline-row-end">
                  <button
                    type="button"
                    className="aichat-btn-primary aichat-btn-fit"
                    onClick={() => onSubmit(q)}
                    disabled={!answers[q.id]?.trim() || Boolean(savingId)}
                  >
                    保存本题
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
