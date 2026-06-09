export type RemoteMessage = {
  id: number;
  fromUserId: string;
  toUserId: string;
  text: string;
  ts: number;
};

export type ConversationItem = {
  peerUserId: string;
  peerPhone: string;
  lastMessageId: number;
  lastText: string;
  lastTs: number;
  lastFromUserId: string;
};
