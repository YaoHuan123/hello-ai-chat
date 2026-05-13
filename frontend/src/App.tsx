import { useEffect, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import type { RouteName } from "./types/routes";
import { HomeShellPage } from "./pages/HomeShellPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { AssistedChatPage } from "./pages/AssistedChatPage";
import { clearAuth, getAuthToken } from "./services/storage";
import { OneWayVisitorPage } from "./pages/OneWayVisitorPage";
import { FeedOneWayAgentPage } from "./pages/FeedOneWayAgentPage";
import { OneWayDataBoardPage } from "./pages/OneWayDataBoardPage";
import { MolWorldPage } from "./pages/MolWorldPage";
import { MyMolsPage } from "./pages/MyMolsPage";
import { MolDetailPage } from "./pages/MolDetailPage";
import { DeleteAccountPage } from "./pages/DeleteAccountPage";
import { getMeApi } from "./services/api";
import { setAndroidBackHandler } from "./platform/androidShell";

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState<RouteName>("home");
  const [molDetailId, setMolDetailId] = useState<"new" | string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken().trim();
    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          setAuthed(false);
          setAuthReady(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    getMeApi(token)
      .then(() => {
        if (!cancelled) setAuthed(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearAuth();
          setAuthed(false);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAndroidBackHandler(() => {
      if (!authed) {
        return false;
      }
      if (route === "home") {
        return false;
      }
      if (route === "delete-account") {
        setRoute("home");
        return true;
      }
      if (route === "mol-detail") {
        setMolDetailId(null);
        setRoute("mol-mine");
        return true;
      }
      setRoute("home");
      return true;
    });
    return () => setAndroidBackHandler(null);
  }, [authed, route]);

  if (!authReady) {
    return (
      <div className="aichat-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <p style={{ color: "var(--aichat-muted)", fontSize: 15 }}>加载中…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginPage
        onSuccess={() => {
          setAuthed(true);
          setRoute("home");
        }}
      />
    );
  }

  if (route === "delete-account") {
    return (
      <DeleteAccountPage
        onBack={() => setRoute("home")}
        onAccountDeleted={() => {
          setRoute("home");
          setAuthed(false);
        }}
      />
    );
  }

  if (route === "home") {
    return (
      <HomeShellPage
        onNavigate={setRoute}
        onLogout={() => {
          clearAuth();
          setRoute("home");
          setAuthed(false);
        }}
      />
    );
  }

  if (route === "chat-assist") {
    return <AssistedChatPage onBack={() => setRoute("home")} />;
  }
  if (route === "oneway-visitor") {
    return <OneWayVisitorPage onBack={() => setRoute("home")} />;
  }
  if (route === "feed-oneway-agent") {
    return <FeedOneWayAgentPage onBack={() => setRoute("home")} />;
  }
  if (route === "oneway-data-board") {
    return <OneWayDataBoardPage onBack={() => setRoute("home")} />;
  }
  if (route === "mol-world") {
    return (
      <MolWorldPage onBack={() => setRoute("home")} onMyMols={() => setRoute("mol-mine")} />
    );
  }
  if (route === "mol-mine") {
    return (
      <MyMolsPage
        onBack={() => setRoute("home")}
        onOpenWorld={() => setRoute("mol-world")}
        onOpenDetail={(id) => {
          setMolDetailId(id);
          setRoute("mol-detail");
        }}
      />
    );
  }
  if (route === "mol-detail" && molDetailId !== null) {
    return (
      <MolDetailPage
        molId={molDetailId}
        onBack={() => {
          setMolDetailId(null);
          setRoute("mol-mine");
        }}
      />
    );
  }
  return <PlaceholderPage route={route} onBack={() => setRoute("home")} />;
}

export { App };
