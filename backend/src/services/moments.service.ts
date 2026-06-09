import type { DatabaseSync } from "node:sqlite";
import type { ContactsService } from "./contacts.service";
import type { MomentsAiService, ExploreChatLine } from "./momentsAi.service";

export type MomentItem = {
  id: string;
  type: "qa" | "free";
  title: string;
  body: string;
  ts: number;
  sourceTopicId?: string;
};

const MAX_ITEMS = 80;
const MAX_ITEM_BODY = 4000;
const MAX_ITEM_TITLE = 200;

export class MomentsService {
  constructor(
    private readonly db: DatabaseSync,
    private readonly contacts: ContactsService,
    private readonly momentsAi: MomentsAiService,
  ) {}

  listMine(userId: string): MomentItem[] {
    return this.loadItems(userId);
  }

  replaceMine(userId: string, itemsRaw: MomentItem[]): MomentItem[] {
    const items = this.sanitizeItems(itemsRaw);
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO user_moment_feeds (user_id, items_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET items_json = excluded.items_json, updated_at = excluded.updated_at`,
      )
      .run(userId, JSON.stringify(items), now);
    return items;
  }

  listForFriend(viewerId: string, ownerId: string): MomentItem[] {
    if (viewerId === ownerId) return this.loadItems(ownerId);
    if (!this.contacts.areMutualContacts(viewerId, ownerId)) {
      throw new Error("NOT_FRIENDS");
    }
    return this.loadItems(ownerId);
  }

  async exploreReply(
    viewerId: string,
    ownerId: string,
    textRaw: string,
    lastMessages: ExploreChatLine[] = [],
  ): Promise<{ reply: string }> {
    if (viewerId === ownerId) throw new Error("SELF");
    if (!this.contacts.areMutualContacts(viewerId, ownerId)) {
      throw new Error("NOT_FRIENDS");
    }
    const text = String(textRaw ?? "").trim();
    if (!text || text.length > 2000) throw new Error("INVALID_PARAMS");

    const moments = this.loadItems(ownerId);
    const ownerRow = this.db.prepare("SELECT phone FROM users WHERE id = ?").get(ownerId) as { phone: string } | undefined;
    const ownerName = ownerRow?.phone ? maskPhone(ownerRow.phone) : "TA";

    if (!this.momentsAi.isConfigured()) {
      throw new Error("AI_NOT_CONFIGURED");
    }

    const reply = await this.momentsAi.exploreReply({
      ownerName,
      moments,
      lastMessages: lastMessages.slice(-20),
      latestText: text,
    });
    return { reply };
  }

  private loadItems(userId: string): MomentItem[] {
    const row = this.db
      .prepare(`SELECT items_json AS itemsJson FROM user_moment_feeds WHERE user_id = ?`)
      .get(userId) as { itemsJson: string } | undefined;
    if (!row) return [];
    try {
      const parsed = JSON.parse(row.itemsJson) as unknown;
      if (!Array.isArray(parsed)) return [];
      return this.sanitizeItems(parsed as MomentItem[]);
    } catch {
      return [];
    }
  }

  private sanitizeItems(items: MomentItem[]): MomentItem[] {
    const out: MomentItem[] = [];
    const seen = new Set<string>();
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const id = String(raw.id ?? "").trim();
      if (!id || seen.has(id)) continue;
      const type = raw.type === "qa" ? "qa" : raw.type === "free" ? "free" : null;
      if (!type) continue;
      const body = String(raw.body ?? "").trim().slice(0, MAX_ITEM_BODY);
      if (!body) continue;
      const title = String(raw.title ?? "").trim().slice(0, MAX_ITEM_TITLE);
      const ts = typeof raw.ts === "number" && Number.isFinite(raw.ts) ? raw.ts : Date.now();
      const item: MomentItem = { id, type, title, body, ts };
      if (raw.sourceTopicId && typeof raw.sourceTopicId === "string") {
        item.sourceTopicId = raw.sourceTopicId.trim();
      }
      out.push(item);
      seen.add(id);
      if (out.length >= MAX_ITEMS) break;
    }
    return out;
  }
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}
