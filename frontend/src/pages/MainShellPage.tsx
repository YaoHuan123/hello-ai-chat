import { useState } from "react";
import type { ContactItem } from "../types/contact";
import type { RouteName } from "../types/routes";
import { ContactsPage } from "./ContactsPage";
import { MessagesTab } from "./main/MessagesTab";
import { MomentsTab } from "./main/MomentsTab";
import { AiTab } from "./main/AiTab";
import { MeTab } from "./main/MeTab";

export type MainTabId = "messages" | "moments" | "ai" | "contacts" | "me";

type Props = {
  activeTab?: MainTabId;
  onTabChange?: (tab: MainTabId) => void;
  onOpenChatRoom: (c: ContactItem) => void;
  onOpenMomentsFriend: (c: ContactItem) => void;
  onNavigateFeature: (route: RouteName) => void;
  onLogout: () => void;
  friendRequestPendingCount: number;
  onOpenFriendRequests: () => void;
  onFriendRequestSent: () => void;
  onOpenGuardianGroup: (groupId: string) => void;
  onOpenGuardianHall: () => void;
};

const TAB_LABEL: Record<MainTabId, string> = {
  messages: "消息",
  moments: "朋友圈",
  ai: "AI",
  contacts: "联系人",
  me: "我的",
};

const TAB_ORDER: MainTabId[] = ["messages", "moments", "ai", "contacts", "me"];

export function MainShellPage({
  activeTab,
  onTabChange,
  onOpenChatRoom,
  onOpenMomentsFriend,
  onNavigateFeature,
  onLogout,
  friendRequestPendingCount,
  onOpenFriendRequests,
  onFriendRequestSent,
  onOpenGuardianGroup,
  onOpenGuardianHall,
}: Props) {
  const [internalTab, setInternalTab] = useState<MainTabId>("messages");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  return (
    <div className="aichat-shell aichat-main-shell">
      <div className="aichat-main-shell__body">
        {tab === "messages" && (
          <div className="msg-tab-root msg-mode-normal">
            <MessagesTab
              onOpenChatRoom={onOpenChatRoom}
              onOpenGuardianGroup={onOpenGuardianGroup}
              onOpenGuardianHall={onOpenGuardianHall}
            />
          </div>
        )}
        {tab === "moments" && <MomentsTab onOpenFriend={onOpenMomentsFriend} onNavigateFeature={onNavigateFeature} />}
        {tab === "ai" && <AiTab onNavigateFeature={onNavigateFeature} />}
        {tab === "contacts" && (
          <div className="aichat-main-shell-tab aichat-main-shell-tab--embed">
            <ContactsPage
              embedded
              onBack={() => setTab("messages")}
              onOpenFriendRequests={onOpenFriendRequests}
              friendRequestPendingCount={friendRequestPendingCount}
              onFriendRequestSent={onFriendRequestSent}
              onOpenChat={onOpenChatRoom}
            />
          </div>
        )}
        {tab === "me" && <MeTab onNavigateFeature={onNavigateFeature} onLogout={onLogout} />}
      </div>

      <nav className="aichat-tabbar" aria-label="主导航">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={`aichat-tabbar__btn ${tab === id ? "aichat-tabbar__btn--active" : ""}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}
