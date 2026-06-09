import type { RouteName } from "../../types/routes";
import { getMaskedPhone } from "../../services/storage";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
  onLogout: () => void;
};

export function MeTab({ onNavigateFeature, onLogout }: Props) {
  const phone = getMaskedPhone();

  return (
    <div className="aichat-main-shell-tab">
      <header className="aichat-topbar">
        <h1>我的</h1>
        <p>{phone || "已登录"}</p>
      </header>
      <div className="aichat-main">
        <ul className="aichat-list" aria-label="账号">
          <li>
            <button type="button" className="aichat-nav-item" onClick={() => onNavigateFeature("delete-account")}>
              <span>注销账号</span>
            </button>
          </li>
        </ul>

        <button type="button" className="aichat-btn-ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => onNavigateFeature("home")}>
          更多功能
        </button>

        <button type="button" className="aichat-btn-ghost" style={{ marginTop: 20, width: "100%" }} onClick={onLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}
