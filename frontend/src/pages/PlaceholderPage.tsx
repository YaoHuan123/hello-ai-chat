import { ROUTE_LABEL, type RouteName } from "../types/routes";

type Props = {
  route: RouteName;
  onBack: () => void;
};

export function PlaceholderPage({ route, onBack }: Props) {
  const meta = ROUTE_LABEL[route];
  return (
    <div className="aichat-shell">
      <header className="aichat-topbar">
        <h1>{meta.title}</h1>
        <p>占位 — {meta.phase}</p>
      </header>
      <div className="aichat-main">
        <button type="button" className="aichat-back" onClick={onBack}>
          ← 返回
        </button>
        <div className="aichat-card aichat-placeholder">
          <h2>未实现</h2>
          <p>该页面在后续计划阶段中实现。当前为阶段 0 路由占位与导航联调。</p>
        </div>
      </div>
    </div>
  );
}
