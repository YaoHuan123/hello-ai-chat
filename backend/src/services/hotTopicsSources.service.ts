import { HOT_TOPICS_FETCH_TIMEOUT_MS } from "../config";

export type HotTopicPlatform = "weibo" | "zhihu" | "douyin";

export type RawTrendItem = {
  platform: HotTopicPlatform;
  title: string;
  rank: number;
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PER_PLATFORM_LIMIT = 15;

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOT_TOPICS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    return await res.json();
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("FETCH_TIMEOUT");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function cleanTitle(raw: string): string {
  return raw.replace(/^#+|#+$/g, "").replace(/\s+/g, " ").trim();
}

function parseWeibo(raw: unknown): RawTrendItem[] {
  if (!raw || typeof raw !== "object") throw new Error("WEIBO_PARSE_ERROR");
  const data = (raw as { data?: { realtime?: unknown } }).data;
  const list = data?.realtime;
  if (!Array.isArray(list)) throw new Error("WEIBO_PARSE_ERROR");

  const out: RawTrendItem[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    if (item.is_ad === 1) continue;
    const word = cleanTitle(String(item.word ?? item.note ?? ""));
    if (!word) continue;
    const rank = typeof item.realpos === "number" ? item.realpos : typeof item.rank === "number" ? item.rank + 1 : out.length + 1;
    out.push({ platform: "weibo", title: word, rank });
    if (out.length >= PER_PLATFORM_LIMIT) break;
  }
  if (out.length === 0) throw new Error("WEIBO_EMPTY");
  return out;
}

function parseZhihu(raw: unknown): RawTrendItem[] {
  if (!raw || typeof raw !== "object") throw new Error("ZHIHU_PARSE_ERROR");
  const list = (raw as { data?: unknown }).data;
  if (!Array.isArray(list)) throw new Error("ZHIHU_PARSE_ERROR");

  const out: RawTrendItem[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const target = (row as { target?: { title?: unknown } }).target;
    const title = cleanTitle(String(target?.title ?? ""));
    if (!title) continue;
    out.push({ platform: "zhihu", title, rank: i + 1 });
    if (out.length >= PER_PLATFORM_LIMIT) break;
  }
  if (out.length === 0) throw new Error("ZHIHU_EMPTY");
  return out;
}

function parseDouyin(raw: unknown): RawTrendItem[] {
  if (!raw || typeof raw !== "object") throw new Error("DOUYIN_PARSE_ERROR");
  const status = (raw as { status_code?: unknown }).status_code;
  if (status !== 0) throw new Error("DOUYIN_PARSE_ERROR");
  const wordList = (raw as { data?: { word_list?: unknown } }).data?.word_list;
  if (!Array.isArray(wordList)) throw new Error("DOUYIN_PARSE_ERROR");

  const out: RawTrendItem[] = [];
  for (const row of wordList) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const title = cleanTitle(String(item.word ?? ""));
    if (!title) continue;
    const rank = typeof item.position === "number" ? item.position : out.length + 1;
    out.push({ platform: "douyin", title, rank });
    if (out.length >= PER_PLATFORM_LIMIT) break;
  }
  if (out.length === 0) throw new Error("DOUYIN_EMPTY");
  return out;
}

export class HotTopicsSourcesService {
  async fetchWeibo(): Promise<RawTrendItem[]> {
    const raw = await fetchJson("https://weibo.com/ajax/side/hotSearch", { Referer: "https://weibo.com" });
    return parseWeibo(raw);
  }

  async fetchZhihu(): Promise<RawTrendItem[]> {
    const raw = await fetchJson("https://api.zhihu.com/topstory/hot-lists/total?limit=20");
    return parseZhihu(raw);
  }

  async fetchDouyin(): Promise<RawTrendItem[]> {
    const raw = await fetchJson("https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383", {
      Referer: "https://www.douyin.com",
    });
    return parseDouyin(raw);
  }

  async fetchAll(): Promise<RawTrendItem[]> {
    const [weibo, zhihu, douyin] = await Promise.all([this.fetchWeibo(), this.fetchZhihu(), this.fetchDouyin()]);
    const merged = [...weibo, ...zhihu, ...douyin];
    const seen = new Set<string>();
    const deduped: RawTrendItem[] = [];
    for (const item of merged) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    if (deduped.length === 0) {
      throw new Error("TRENDS_EMPTY");
    }
    return deduped;
  }
}

export function formatTrendsBlock(items: RawTrendItem[]): string {
  const platformLabel: Record<HotTopicPlatform, string> = {
    weibo: "微博",
    zhihu: "知乎",
    douyin: "抖音",
  };
  return items
    .slice(0, 45)
    .map((t) => `${platformLabel[t.platform]}｜${t.title}`)
    .join("\n");
}