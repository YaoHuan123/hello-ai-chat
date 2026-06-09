import type { ContactsService } from "./contacts.service";
import { pushToUser } from "../ws/wsServer";

export type MessageRow = {
  id: number;
  fromUserId: string;
  toUserId: string;
  text: string;
  ts: number;
};

export type ConversationPreview = {
  peerUserId: string;
  peerPhone: string;
  lastMessageId: number;
  lastText: string;
  lastTs: number;
  lastFromUserId: string;
};

const MAX_TEXT = 4000;

/**
 * 聊天内容不落库：仅校验关系并生成 ephemeral 消息，由调用方经 WebSocket 转发。
 * 历史记录由各客户端本地保存，换设备丢失。
 */
export class MessagesService {
  constructor(private readonly contacts: ContactsService) {}

  relay(fromUserId: string, toUserId: string, textRaw: string): MessageRow {
    const text = String(textRaw ?? "").trim();
    if (!text) throw new Error("INVALID_PARAMS");
    if (text.length > MAX_TEXT) throw new Error("INVALID_PARAMS");
    if (fromUserId === toUserId) throw new Error("SELF");

    if (!this.contacts.areMutualContacts(fromUserId, toUserId)) {
      throw new Error("NOT_FRIENDS");
    }

    const ts = Date.now();
    const id = ts * 1000 + Math.floor(Math.random() * 1000);
    return {
      id,
      fromUserId,
      toUserId,
      text,
      ts,
    };
  }

  /** @deprecated 聊天仅存本地，服务端不返回历史 */
  listWithPeer(_meUserId: string, _peerUserId: string, _beforeId?: number, _limit = 50): MessageRow[] {
    return [];
  }

  /** @deprecated 会话预览由客户端本地汇总 */
  listConversations(_meUserId: string): ConversationPreview[] {
    return [];
  }

  pushToPeer(msg: MessageRow): void {
    pushToUser(msg.toUserId, {
      type: "message",
      payload: {
        id: msg.id,
        fromUserId: msg.fromUserId,
        toUserId: msg.toUserId,
        text: msg.text,
        ts: msg.ts,
      },
    });
  }
}
