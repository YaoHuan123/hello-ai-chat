export type YiyiTrashItem = {
  id: string;
  label: string;
  hint?: string;
  enabled: boolean;
  isCustom: boolean;
};

export type YiyiProfile = {
  socialDirection: string;
  personality: string;
  other: string;
  tags: {
    social: string[];
    personality: string[];
    other: string[];
  };
};

export type YiyiPermissions = {
  allowAddFriend: boolean;
  yiyiActive: boolean;
};

export type YiyiOwnerChatMessage = {
  id: string;
  from: "me" | "yiyi";
  text: string;
  ts: number;
  topics?: string[];
};

export type YiyiBridgeStatus = "effective" | "blocked";

export type YiyiBridgeTranscriptLine = {
  from: "a" | "b";
  text: string;
  ts: number;
};

export type YiyiBridgeSession = {
  id: string;
  peerUserId: string;
  peerLabel: string;
  peerAccent: string;
  status: YiyiBridgeStatus;
  preview: string;
  tags: string[];
  blockedReason?: string;
  transcript: YiyiBridgeTranscriptLine[];
  ts: number;
};

export type YiyiUserState = {
  trash: YiyiTrashItem[];
  permissions: YiyiPermissions;
  profile: YiyiProfile;
  ownerChat: YiyiOwnerChatMessage[];
};
