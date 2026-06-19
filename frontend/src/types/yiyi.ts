export type YiyiTrashItem = {
  id: string;
  label: string;
  hint?: string;
  enabled: boolean;
  isCustom: boolean;
};

export type YiyiChatMessage = {
  id: string;
  from: "me" | "yiyi";
  text: string;
  ts: number;
  /** YiYi 消息附带的推荐问题 */
  topics?: string[];
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

export type YiyiBridgeStatus = "effective" | "blocked";

export type YiyiBridgeMessage = {
  id: string;
  peerLabel: string;
  peerAccent: string;
  status: YiyiBridgeStatus;
  preview: string;
  tags: string[];
  ts: number;
};
