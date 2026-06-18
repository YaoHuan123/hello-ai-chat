import { AppIcon } from "../../components/AppIcons";
import type { RouteName } from "../../types/routes";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
};

export function ExploreTab({ onNavigateFeature }: Props) {
  return (
    <div className="aichat-main-shell-tab explore-tab">
      <header className="aichat-topbar aichat-topbar--plain">
        <h1>探索</h1>
      </header>
      <div className="aichat-main">
        <section className="me-tab__group" aria-label="发现">
          <button type="button" className="me-tab__row" onClick={() => onNavigateFeature("moments-hub")}>
            <span className="me-tab__row-icon me-tab__row-icon--moments" aria-hidden>
              <AppIcon name="hot" className="app-icon app-icon--sm app-icon--hot" />
            </span>
            <span className="me-tab__row-body">
              <b>朋友圈</b>
              <span>探索好友、我的动态与热点</span>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
          <button type="button" className="me-tab__row" onClick={() => onNavigateFeature("yiyi-home")}>
            <span className="me-tab__row-icon me-tab__row-icon--yiyi" aria-hidden>
              <AppIcon name="user" className="app-icon app-icon--sm app-icon--purple" />
            </span>
            <span className="me-tab__row-body">
              <b>YiYi</b>
              <span>偏好与边界，对外沟通中间人</span>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
