import type { RouteName } from "../../types/routes";
import { getMaskedPhone } from "../../services/storage";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
  onLogout: () => void;
};

export function MeTab({ onNavigateFeature, onLogout }: Props) {
  const phone = getMaskedPhone();
  const avatarLetter = phone ? phone.replace(/\D/g, "").slice(-1) || "我" : "我";

  return (
    <div className="aichat-main-shell-tab me-tab">
      <header className="aichat-topbar aichat-topbar--plain">
        <h1>我的</h1>
      </header>
      <div className="aichat-main">
        <div className="me-tab__hero">
          <div className="me-tab__avatar" aria-hidden>
            {avatarLetter}
          </div>
          <div className="me-tab__hero-meta">
            <strong>{phone || "—"}</strong>
          </div>
        </div>

        <section className="me-tab__group" aria-label="设置">
          <button type="button" className="me-tab__row" onClick={() => onNavigateFeature("delete-account")}>
            <span className="me-tab__row-body">
              <b>注销账号</b>
            </span>
            <span className="me-tab__row-chev" aria-hidden>
              ›
            </span>
          </button>
        </section>

        <button type="button" className="me-tab__logout" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}
