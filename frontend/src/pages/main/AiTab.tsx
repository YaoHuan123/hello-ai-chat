import { GUARDIAN } from "../../constants/productCopy";
import type { RouteName } from "../../types/routes";
import { SUYAN } from "../../constants/suyanCopy";

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
          <span className="aichat-ai-big-card__title">{SUYAN.my}</span>
          <span className="aichat-ai-big-card__body">{SUYAN.tagline}</span>
        </button>

        <button type="button" className="aichat-ai-big-card aichat-ai-big-card--guardian" onClick={() => onNavigateFeature("guardian-hall")}>
          <span className="aichat-ai-big-card__title">{GUARDIAN.name}</span>
          <span className="aichat-ai-big-card__body">性格各异，进群主动接话</span>
        </button>
      </div>
    </div>
  );
}
