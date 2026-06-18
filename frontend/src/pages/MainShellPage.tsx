import { useState } from "react";
import type { ContactItem } from "../types/contact";
import type { RouteName } from "../types/routes";
import { isNativeAppShell } from "../platform/appShell";
import { MessagesTab } from "./main/MessagesTab";
import { ExploreTab } from "./main/ExploreTab";
import { PersonaTab } from "./main/PersonaTab";
import { MeTab } from "./main/MeTab";

export type MainTabId = "messages" | "explore" | "people" | "me";

type Props = {
  activeTab?: MainTabId;
  onTabChange?: (tab: MainTabId) => void;
  onOpenChatRoom: (c: ContactItem) => void;
  onNavigateFeature: (route: RouteName) => void;
  onLogout: () => void;
  friendRequestPendingCount: number;
  onOpenFriendRequests: () => void;
  onFriendRequestSent: () => void;
  onOpenGuardianGroup: (groupId: string) => void;
  onCreateGuardianGroup: () => void;
  onOpenGuardianHall: (fromTab: "people" | "messages") => void;
};

const TAB_LABEL: Record<MainTabId, string> = {
  messages: "消息",
  explore: "探索",
  people: "关系",
  me: "我的",
};

const TAB_ORDER: MainTabId[] = ["messages", "explore", "people", "me"];

function TabIcon({ id }: { id: MainTabId }) {
  switch (id) {
    case "messages":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case "explore":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "people":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "me":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

export function MainShellPage({
  activeTab,
  onTabChange,
  onOpenChatRoom,
  onNavigateFeature,
  onLogout,
  friendRequestPendingCount,
  onOpenFriendRequests,
  onFriendRequestSent,
  onOpenGuardianGroup,
  onCreateGuardianGroup,
  onOpenGuardianHall,
}: Props) {
  const [internalTab, setInternalTab] = useState<MainTabId>("messages");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
  const showSidebar = !isNativeAppShell();

  return (
    <div className="aichat-shell aichat-main-shell">
      {showSidebar && (
        <aside className="aichat-sidebar" aria-label="侧边导航">
          <div className="aichat-sidebar__brand">
            <span className="aichat-sidebar__logo">AIChat</span>
          </div>
          <nav className="aichat-sidebar__nav">
            {TAB_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`aichat-sidebar__btn ${tab === id ? "aichat-sidebar__btn--active" : ""}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <TabIcon id={id} />
                <span>{TAB_LABEL[id]}</span>
              </button>
            ))}
          </nav>
        </aside>
      )}

      <div className="aichat-main-shell__frame">
        <div className="aichat-main-shell__body">
          {tab === "messages" && (
            <div className="msg-tab-root msg-mode-normal">
              <MessagesTab
                onOpenChatRoom={onOpenChatRoom}
                onOpenGuardianGroup={onOpenGuardianGroup}
                onCreateGuardianGroup={onCreateGuardianGroup}
                onOpenGuardianHall={() => onOpenGuardianHall("messages")}
              />
            </div>
          )}
          {tab === "explore" && <ExploreTab onNavigateFeature={onNavigateFeature} />}
          {tab === "people" && (
            <PersonaTab
              onOpenChat={onOpenChatRoom}
              onOpenFriendRequests={onOpenFriendRequests}
              friendRequestPendingCount={friendRequestPendingCount}
              onFriendRequestSent={onFriendRequestSent}
              onOpenGuardianHall={() => onOpenGuardianHall("people")}
            />
          )}
          {tab === "me" && <MeTab onNavigateFeature={onNavigateFeature} onLogout={onLogout} />}
        </div>

        <nav className="aichat-tabbar" aria-label="主导航">
          {TAB_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`aichat-tabbar__btn ${tab === id ? "aichat-tabbar__btn--active" : ""}`}
              data-tab={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <span className="aichat-tabbar__icon">
                <TabIcon id={id} />
              </span>
              <span className="aichat-tabbar__label">{TAB_LABEL[id]}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
