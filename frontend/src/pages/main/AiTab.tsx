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
          <span className="aichat-ai-big-card__title">我的 Mol</span>
          <span className="aichat-ai-big-card__body">管理 Mol 的风格与话术样例</span>
        </button>

        <button type="button" className="aichat-ai-big-card aichat-ai-big-card--guardian" onClick={() => onNavigateFeature("guardian-hall")}>
          <span className="aichat-ai-big-card__title">AI联系人</span>
          <span className="aichat-ai-big-card__body">群聊虚拟成员，可主动接话</span>
        </button>
      </div>
    </div>
  );
}
