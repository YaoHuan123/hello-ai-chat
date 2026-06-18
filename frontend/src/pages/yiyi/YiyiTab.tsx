import { useCallback, useEffect, useState } from "react";
import { AppIcon } from "../../components/AppIcons";
import { loadYiyiState, permissionsSummaryFrom, profileSummaryFrom, type YiyiUserState } from "../../services/yiyiClient";
import type { RouteName } from "../../types/routes";

type Props = {
  onNavigateFeature: (route: RouteName) => void;
  onBack?: () => void;
};

export function YiyiTab({ onNavigateFeature, onBack }: Props) {
  const [state, setState] = useState<YiyiUserState | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiState()
      .then(setState)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [reload]);

  const trashCount = state?.trash.filter((x) => x.enabled).length ?? 0;
  const profileSummary = state ? profileSummaryFrom(state.profile) : "";
  const permSummary = state ? permissionsSummaryFrom(state.permissions) : "";

  return (
    <div className="aichat-main-shell-tab yiyi-tab">
      <header className="aichat-topbar aichat-topbar-flex yiyi-tab__topbar">
        {onBack ? (
          <button type="button" className="aichat-btn-ghost yiyi-tab__topbar-back" onClick={onBack}>
            返回
          </button>
        ) : (
          <span className="yiyi-tab__topbar-spacer" aria-hidden />
        )}
        <div className="aichat-stage-head">
          <h1>YiYi</h1>
        </div>
        <button type="button" className="yiyi-tab__topbar-link" onClick={() => onNavigateFeature("yiyi-settings")}>
          设置
        </button>
      </header>

      <div className="aichat-main yiyi-tab__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        {loading && !state ? <p className="yiyi-empty">加载中…</p> : null}

        <section className="yiyi-hero" aria-label="YiYi 介绍">
          <h2 className="yiyi-hero__title">你的中间人 YiYi</h2>
          <p className="yiyi-hero__desc">先和你聊清楚偏好与边界，再代表你参与对外沟通。</p>
        </section>

        <p className="yiyi-section-label">管理</p>
        <button type="button" className="yiyi-row" onClick={() => onNavigateFeature("yiyi-trash")}>
          <span className="yiyi-row__icon yiyi-row__icon--trash" aria-hidden>
            ×
          </span>
          <span className="yiyi-row__body">
            <strong className="yiyi-row__title">网络垃圾桶</strong>
            <span className="yiyi-row__sub">已屏蔽 {trashCount} 类沟通方式</span>
          </span>
          <span className="yiyi-row__chev" aria-hidden>
            ›
          </span>
        </button>

        <p className="yiyi-section-label">对话</p>
        <button type="button" className="yiyi-row" onClick={() => onNavigateFeature("yiyi-profile")}>
          <span className="yiyi-row__icon yiyi-row__icon--profile" aria-hidden>
            <AppIcon name="user" className="app-icon app-icon--sm app-icon--purple" />
          </span>
          <span className="yiyi-row__body">
            <strong className="yiyi-row__title">YiYi</strong>
            <span className="yiyi-row__sub">{profileSummary || "暂未形成画像，多和 YiYi 聊聊"}</span>
          </span>
          <span className="yiyi-row__chev" aria-hidden>
            ›
          </span>
        </button>

        <button type="button" className="yiyi-row" onClick={() => onNavigateFeature("yiyi-messages")}>
          <span className="yiyi-row__icon yiyi-row__icon--msg" aria-hidden>
            <AppIcon name="mail" className="app-icon app-icon--sm" />
          </span>
          <span className="yiyi-row__body">
            <strong className="yiyi-row__title">YiYi 的消息</strong>
            <span className="yiyi-row__sub">查看 YiYi 之间的沟通结果</span>
          </span>
          <span className="yiyi-row__chev" aria-hidden>
            ›
          </span>
        </button>

        <p className="yiyi-section-label">隐私</p>
        <button type="button" className="yiyi-row" onClick={() => onNavigateFeature("yiyi-settings")}>
          <span className="yiyi-row__icon yiyi-row__icon--settings" aria-hidden>
            <AppIcon name="user" className="app-icon app-icon--sm" />
          </span>
          <span className="yiyi-row__body">
            <strong className="yiyi-row__title">权限与可见范围</strong>
            <span className="yiyi-row__sub">{permSummary || "—"}</span>
          </span>
          <span className="yiyi-row__chev" aria-hidden>
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
