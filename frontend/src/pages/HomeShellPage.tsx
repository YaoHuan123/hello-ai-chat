import { useEffect, useState } from "react";
import { PRODUCT } from "../constants/productCopy";
import { getApiHealth } from "../services/api";
import { isApiMock } from "../services/mock";
import { getMaskedPhone } from "../services/storage";
import { HOME_ENTRY_ROUTES, ROUTE_LABEL, type RouteName } from "../types/routes";

type Props = {
  onNavigate: (route: RouteName) => void;
  onLogout: () => void;
};

export function HomeShellPage({ onNavigate, onLogout }: Props) {
  const displayName = getMaskedPhone();
  const mock = isApiMock();
  const [healthOk, setHealthOk] = useState<boolean | null>(mock ? true : null);
  const [healthErr, setHealthErr] = useState<string | null>(null);

  useEffect(() => {
    if (mock) return;
    let cancel = false;
    getApiHealth()
      .then((h) => {
        if (!cancel) {
          setHealthOk(Boolean(h.ok));
        }
      })
      .catch((e: unknown) => {
        if (!cancel) {
          setHealthOk(false);
          setHealthErr(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancel = true;
    };
  }, [mock]);

  return (
    <div className="aichat-shell">
      <header className="aichat-topbar aichat-topbar-flex">
        <div>
          <h1>{PRODUCT.name}</h1>
          <p>
            {displayName} · 主导航
          </p>
        </div>
        <button className="aichat-btn-ghost" type="button" onClick={onLogout}>
          退出
        </button>
      </header>
      <div className="aichat-main">
        <div className="aichat-card">
          <span
            className={`aichat-mock-badge ${mock ? "" : "off"}`}
            title={String(import.meta.env.VITE_USE_MOCK ?? "0")}
          >
            {mock ? "已跳过 /health（VITE_USE_MOCK=1）" : "已连接后端 · 将请求 /health"}
          </span>
          {!mock && healthOk === false && healthErr && (
            <p style={{ fontSize: 14, color: "var(--aichat-danger)", marginTop: 0 }}>{healthErr}</p>
          )}
          {!mock && healthOk === true && (
            <p style={{ fontSize: 14, color: "var(--aichat-muted)", marginTop: 0 }}>后端 /health 正常</p>
          )}
        </div>

        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--aichat-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            margin: "20px 0 10px 4px",
          }}
        >
          功能入口
        </h2>
        <ul className="aichat-list" aria-label="功能入口">
          {HOME_ENTRY_ROUTES.map((r) => (
            <li key={r}>
              <button type="button" className="aichat-nav-item" onClick={() => onNavigate(r)}>
                <span>{ROUTE_LABEL[r].title}</span>
                <span className="phase">{ROUTE_LABEL[r].phase}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
