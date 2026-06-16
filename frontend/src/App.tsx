import { useCallback, useEffect, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import type { RouteName } from "./types/routes";
import { HomeShellPage } from "./pages/HomeShellPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { AssistedChatPage } from "./pages/AssistedChatPage";
import { ingestIncomingRemoteMessage } from "./services/normalChatLocalStorage";
import { clearAuth, getAuthToken, getUserId } from "./services/storage";
import { MolWorldPage } from "./pages/MolWorldPage";
import { MyMolsPage } from "./pages/MyMolsPage";
import { MolDetailPage } from "./pages/MolDetailPage";
import { DeleteAccountPage } from "./pages/DeleteAccountPage";
import { ContactsPage } from "./pages/ContactsPage";
import { FriendRequestsPage } from "./pages/FriendRequestsPage";
import { getMeApi } from "./services/api";
import { setAvatarCache, setNicknameCache } from "./services/storage";
import { getFriendRequestPendingCountApi } from "./services/friendRequestsApi";
import { wsClient } from "./services/wsClient";
import { setAndroidBackHandler } from "./platform/androidShell";
import { MainShellPage, type MainTabId } from "./pages/MainShellPage";
import { ChatRoomPage } from "./pages/main/ChatRoomPage";
import type { ContactItem } from "./types/contact";
import { AssistMolListPage } from "./pages/ai/AssistMolListPage";
import { AssistMolDataPage } from "./pages/ai/AssistMolDataPage";
import { MyMomentsPage } from "./pages/ai/MyMomentsPage";
import { MomentsHotTopicsPage } from "./pages/ai/MomentsHotTopicsPage";
import { MomentsExploreChatPage } from "./pages/ai/MomentsExploreChatPage";
import { YiyiTrashPage } from "./pages/yiyi/YiyiTrashPage";
import { YiyiChatPage } from "./pages/yiyi/YiyiChatPage";
import { YiyiMessagesPage } from "./pages/yiyi/YiyiMessagesPage";
import { YiyiProfilePage } from "./pages/yiyi/YiyiProfilePage";
import { YiyiSettingsPage } from "./pages/yiyi/YiyiSettingsPage";
import { GuardianHallPage } from "./pages/guardian/GuardianHallPage";
import { GuardianRoleDetailPage } from "./pages/guardian/GuardianRoleDetailPage";
import { CreateGuardianGroupFeaturePage } from "./pages/guardian/CreateGuardianGroupFeaturePage";
import { CreateGuardianGroupPage } from "./pages/guardian/CreateGuardianGroupPage";
import { GroupChatRoomPage } from "./pages/guardian/GroupChatRoomPage";
import type { GuardianCreateFeature } from "./constants/guardianCreateFeatures";

type MolDetailBackTarget = "mol-mine" | "assist-mol-list" | "assist-mol-data" | "chat-room";

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState<RouteName>("main");
  const [molDetailId, setMolDetailId] = useState<string | null>(null);
  const [molDetailBackRoute, setMolDetailBackRoute] = useState<MolDetailBackTarget>("mol-mine");
  const [assistMolDataMolId, setAssistMolDataMolId] = useState<string | null>(null);
  const [featureReturnRoute, setFeatureReturnRoute] = useState<RouteName>("main");
  const [molWorldBackRoute, setMolWorldBackRoute] = useState<RouteName>("main");
  const [chatRoomContact, setChatRoomContact] = useState<ContactItem | null>(null);
  const [friendPendingCount, setFriendPendingCount] = useState(0);
  const [guardianCreateFeature, setGuardianCreateFeature] = useState<GuardianCreateFeature | null>(null);
  const [guardianGroupId, setGuardianGroupId] = useState<string | null>(null);
  const [guardianRoleId, setGuardianRoleId] = useState<string | null>(null);
  const [momentsFriendContact, setMomentsFriendContact] = useState<ContactItem | null>(null);
  const [mainTab, setMainTab] = useState<MainTabId>("messages");
  const [guardianHallReturnTab, setGuardianHallReturnTab] = useState<MainTabId>("people");

  const refreshFriendPending = useCallback(() => {
    void getFriendRequestPendingCountApi()
      .then((n) => setFriendPendingCount(n))
      .catch(() => setFriendPendingCount(0));
  }, []);

  const openChatWith = useCallback((c: ContactItem) => {
    setChatRoomContact(c);
    setRoute("chat-room");
  }, []);

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
      .then((me) => {
        if (!cancelled) {
          setNicknameCache(me.nickname);
          setAvatarCache(me.avatarUrl, me.avatarUpdatedAt);
          setAuthed(true);
        }
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
    if (!authed) {
      wsClient.disconnect();
      return;
    }
    const token = getAuthToken().trim();
    if (!token) return;
    wsClient.connect(token);
    refreshFriendPending();
    const unsub = wsClient.subscribe((msg) => {
      if (msg.type === "message") {
        const myUserId = getUserId();
        if (myUserId) ingestIncomingRemoteMessage(myUserId, msg.payload);
        return;
      }
      if (msg.type === "friend_request_received" || msg.type === "friend_request_accepted") {
        refreshFriendPending();
      }
    });
    return () => {
      unsub();
      wsClient.disconnect();
    };
  }, [authed, refreshFriendPending]);

  useEffect(() => {
    setAndroidBackHandler(() => {
      if (!authed) {
        return false;
      }
      if (route === "chat-room") {
        setChatRoomContact(null);
        setRoute("main");
        return true;
      }
      if (route === "guardian-group-chat") {
        setGuardianGroupId(null);
        setMainTab("groups");
        setRoute("main");
        return true;
      }
      if (route === "guardian-create-group") {
        setRoute("guardian-create-feature");
        return true;
      }
      if (route === "guardian-create-feature") {
        setGuardianCreateFeature(null);
        setMainTab("groups");
        setRoute("main");
        return true;
      }
      if (route === "guardian-hall") {
        setMainTab(guardianHallReturnTab);
        setRoute("main");
        return true;
      }
      if (route === "guardian-role-detail") {
        setGuardianRoleId(null);
        setRoute("guardian-hall");
        return true;
      }
      if (route === "main") {
        return false;
      }
      if (route === "home") {
        return false;
      }
      if (route === "delete-account") {
        setRoute(featureReturnRoute);
        return true;
      }
      if (route === "moments-friend") {
        setMomentsFriendContact(null);
        setMainTab("moments");
        setRoute("main");
        return true;
      }
      if (route === "moments-my") {
        setMainTab("moments");
        setRoute("main");
        return true;
      }
      if (route === "moments-hot") {
        setMainTab("moments");
        setRoute("main");
        return true;
      }
      if (route === "yiyi-chat") {
        setMainTab("yiyi");
        setRoute("yiyi-profile");
        return true;
      }
      if (route === "yiyi-trash" || route === "yiyi-messages" || route === "yiyi-profile" || route === "yiyi-settings") {
        setMainTab("yiyi");
        setRoute("main");
        return true;
      }
      if (route === "assist-mol-list") {
        setMainTab("me");
        setRoute("main");
        return true;
      }
      if (route === "assist-mol-data") {
        setAssistMolDataMolId(null);
        setMainTab("me");
        setRoute("main");
        return true;
      }
      if (route === "mol-detail") {
        setMolDetailId(null);
        if (molDetailBackRoute === "assist-mol-data") {
          setRoute("assist-mol-data");
        } else if (molDetailBackRoute === "assist-mol-list") {
          setRoute("assist-mol-list");
        } else if (molDetailBackRoute === "chat-room") {
          setRoute("chat-room");
        } else {
          setRoute("mol-mine");
        }
        return true;
      }
      if (route === "friend-requests") {
        setRoute(featureReturnRoute);
        return true;
      }
      setRoute(featureReturnRoute);
      return true;
    });
    return () => setAndroidBackHandler(null);
  }, [authed, route, featureReturnRoute, molDetailBackRoute, guardianHallReturnTab]);

  if (!authReady) {
    return (
      <div className="aichat-shell aichat-loading-shell">
        <div className="aichat-loading">
          <span className="aichat-loading__spinner" aria-hidden />
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginPage
        onSuccess={() => {
          setAuthed(true);
          setFeatureReturnRoute("main");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "delete-account") {
    return (
      <DeleteAccountPage
        onBack={() => setRoute(featureReturnRoute)}
        onAccountDeleted={() => {
          setRoute("main");
          setAuthed(false);
        }}
      />
    );
  }

  if (route === "guardian-hall") {
    return (
      <GuardianHallPage
        onBack={() => {
          setMainTab(guardianHallReturnTab);
          setRoute("main");
        }}
        onOpenRole={(id) => {
          setGuardianRoleId(id);
          setRoute("guardian-role-detail");
        }}
      />
    );
  }

  if (route === "guardian-role-detail" && guardianRoleId) {
    return (
      <GuardianRoleDetailPage
        key={guardianRoleId}
        roleId={guardianRoleId}
        onBack={() => {
          setGuardianRoleId(null);
          setRoute("guardian-hall");
        }}
      />
    );
  }

  if (route === "guardian-create-feature") {
    return (
      <CreateGuardianGroupFeaturePage
        onBack={() => {
          setGuardianCreateFeature(null);
          setMainTab("groups");
          setRoute("main");
        }}
        onContinue={(feature) => {
          setGuardianCreateFeature(feature);
          setRoute("guardian-create-group");
        }}
      />
    );
  }

  if (route === "guardian-create-group") {
    return (
      <CreateGuardianGroupPage
        feature={guardianCreateFeature}
        onBack={() => setRoute("guardian-create-feature")}
        onCreated={(id) => {
          setGuardianCreateFeature(null);
          setGuardianGroupId(id);
          setMainTab("groups");
          setRoute("guardian-group-chat");
        }}
      />
    );
  }

  if (route === "guardian-group-chat" && guardianGroupId) {
    return (
      <GroupChatRoomPage
        key={guardianGroupId}
        groupId={guardianGroupId}
        onBack={() => {
          setGuardianGroupId(null);
          setMainTab("groups");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "chat-room" && chatRoomContact) {
    return (
      <ChatRoomPage
        key={chatRoomContact.contactUserId}
        contact={chatRoomContact}
        onBack={() => {
          setChatRoomContact(null);
          setRoute("main");
        }}
        onManageMols={() => {
          setFeatureReturnRoute("chat-room");
          setRoute("mol-mine");
        }}
      />
    );
  }

  if (route === "main") {
    return (
      <MainShellPage
        activeTab={mainTab}
        onTabChange={setMainTab}
        friendRequestPendingCount={friendPendingCount}
        onOpenFriendRequests={() => {
          setFeatureReturnRoute("main");
          setRoute("friend-requests");
        }}
        onFriendRequestSent={refreshFriendPending}
        onOpenChatRoom={openChatWith}
        onOpenMomentsFriend={(c) => {
          setMomentsFriendContact(c);
          setRoute("moments-friend");
        }}
        onOpenGuardianGroup={(groupId) => {
          setGuardianGroupId(groupId);
          setRoute("guardian-group-chat");
        }}
        onCreateGuardianGroup={() => {
          setGuardianCreateFeature(null);
          setRoute("guardian-create-feature");
        }}
        onOpenGuardianHall={(fromTab) => {
          setGuardianHallReturnTab(fromTab);
          setRoute("guardian-hall");
        }}
        onNavigateFeature={(r) => {
          setFeatureReturnRoute("main");
          if (r === "home") {
            setRoute("home");
            return;
          }
          if (r === "mol-world") setMolWorldBackRoute("main");
          setRoute(r);
        }}
        onLogout={() => {
          wsClient.disconnect();
          clearAuth();
          setRoute("main");
          setAuthed(false);
        }}
      />
    );
  }

  if (route === "home") {
    return (
      <HomeShellPage
        onNavigate={(r) => {
          setFeatureReturnRoute("home");
          if (r === "mol-world") setMolWorldBackRoute("home");
          setRoute(r);
        }}
        onLogout={() => {
          wsClient.disconnect();
          clearAuth();
          setRoute("main");
          setAuthed(false);
        }}
      />
    );
  }

  if (route === "chat-assist") {
    return <AssistedChatPage onBack={() => setRoute(featureReturnRoute)} />;
  }
  if (route === "contacts") {
    return (
      <ContactsPage
        onBack={() => setRoute(featureReturnRoute)}
        onOpenFriendRequests={() => {
          setFeatureReturnRoute("contacts");
          setRoute("friend-requests");
        }}
        friendRequestPendingCount={friendPendingCount}
        onFriendRequestSent={refreshFriendPending}
        onOpenChat={openChatWith}
      />
    );
  }
  if (route === "friend-requests") {
    return <FriendRequestsPage onBack={() => setRoute(featureReturnRoute)} onChanged={refreshFriendPending} onOpenChatAfterAccept={openChatWith} />;
  }
  if (route === "assist-mol-list") {
    return (
      <AssistMolListPage
        onBack={() => {
          setMainTab("me");
          setRoute("main");
        }}
        onOpenWorld={() => {
          setMolWorldBackRoute("assist-mol-list");
          setRoute("mol-world");
        }}
        onOpenData={(id) => {
          setAssistMolDataMolId(id);
          setRoute("assist-mol-data");
        }}
      />
    );
  }

  if (route === "assist-mol-data" && assistMolDataMolId) {
    return (
      <AssistMolDataPage
        key={assistMolDataMolId}
        molId={assistMolDataMolId}
        onBack={() => {
          setAssistMolDataMolId(null);
          setRoute("assist-mol-list");
        }}
        onRemoved={() => {
          setAssistMolDataMolId(null);
          setRoute("assist-mol-list");
        }}
      />
    );
  }

  if (route === "moments-my") {
    return (
      <MyMomentsPage
        onBack={() => {
          setMainTab("moments");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "moments-hot") {
    return (
      <MomentsHotTopicsPage
        onBack={() => {
          setMainTab("moments");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "moments-friend" && momentsFriendContact) {
    return (
      <MomentsExploreChatPage
        key={momentsFriendContact.contactUserId}
        contact={momentsFriendContact}
        onBack={() => {
          setMomentsFriendContact(null);
          setMainTab("moments");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "yiyi-trash") {
    return (
      <YiyiTrashPage
        onBack={() => {
          setMainTab("yiyi");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "yiyi-chat") {
    return (
      <YiyiChatPage
        onBack={() => {
          setMainTab("yiyi");
          setRoute("yiyi-profile");
        }}
      />
    );
  }

  if (route === "yiyi-messages") {
    return (
      <YiyiMessagesPage
        onBack={() => {
          setMainTab("yiyi");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "yiyi-profile") {
    return (
      <YiyiProfilePage
        onBack={() => {
          setMainTab("yiyi");
          setRoute("main");
        }}
        onContinueChat={() => setRoute("yiyi-chat")}
      />
    );
  }

  if (route === "yiyi-settings") {
    return (
      <YiyiSettingsPage
        onBack={() => {
          setMainTab("yiyi");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "mol-world") {
    return (
      <MolWorldPage onBack={() => setRoute(molWorldBackRoute)} />
    );
  }
  if (route === "mol-mine") {
    return (
      <MyMolsPage
        onBack={() => setRoute(featureReturnRoute)}
        onOpenWorld={() => {
          setMolWorldBackRoute("mol-mine");
          setRoute("mol-world");
        }}
        onOpenDetail={(id) => {
          setMolDetailBackRoute("mol-mine");
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
          if (molDetailBackRoute === "assist-mol-data") {
            setRoute("assist-mol-data");
          } else if (molDetailBackRoute === "assist-mol-list") {
            setRoute("assist-mol-list");
          } else if (molDetailBackRoute === "chat-room") {
            setRoute("chat-room");
          } else {
            setRoute("mol-mine");
          }
        }}
      />
    );
  }
  return <PlaceholderPage route={route} onBack={() => setRoute(featureReturnRoute)} />;
}

export { App };
