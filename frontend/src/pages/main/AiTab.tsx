import type { RouteName } from "../../types/routes";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
};

export function AiTab({ onNavigateFeature }: Props) {
  return (
    <div className="aichat-main-shell-tab">
      <header className="aichat-topbar">
        <h1>AI</h1>
        <p>能力数据与偏好数据</p>
      </header>
      <div className="aichat-main aichat-ai-cards-wrap">
        <button type="button" className="aichat-ai-big-card" onClick={() => onNavigateFeature("assist-mol-list")}>
          <span className="aichat-ai-big-card__title">辅助聊天 MOL</span>
          <span className="aichat-ai-big-card__body">
            侧重性格、表达方式与表达技巧。每个 MOL 可维护对话样例与约束，用于辅助聊天时的风格与话术参考。
          </span>
          <span className="aichat-ai-big-card__cta">进入</span>
        </button>

        <button type="button" className="aichat-ai-big-card aichat-ai-big-card--guardian" onClick={() => onNavigateFeature("guardian-hall")}>
          <span className="aichat-ai-big-card__title">AI联系人</span>
          <span className="aichat-ai-big-card__body">
            群聊里的 AI 虚拟成员，有独立人设。与 Mol 无关，可加入群聊并主动接话。
          </span>
          <span className="aichat-ai-big-card__cta">进入</span>
        </button>
      </div>
    </div>
  );
}
