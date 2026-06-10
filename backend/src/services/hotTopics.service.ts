import fs from "fs";
import path from "path";
import { customAlphabet } from "nanoid";
import { HOT_TOPICS_DIR, HOT_TOPICS_REFRESH_MS } from "../config";
import { logError, logInfo } from "../logger";
import type { HotTopicsAiService, GeneratedHotTopic } from "./hotTopicsAi.service";
import { HotTopicsSourcesService } from "./hotTopicsSources.service";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
const CACHE_FILE = "feed.json";

export type HotTopicsFeed = {
  updatedAt: number;
  nextRefreshAt: number;
  topics: GeneratedHotTopic[];
  sourceTrendCount: number;
};

export class HotTopicsService {
  private readonly sources = new HotTopicsSourcesService();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;
  private memoryCache: HotTopicsFeed | null = null;

  constructor(private readonly ai: HotTopicsAiService) {
    fs.mkdirSync(HOT_TOPICS_DIR, { recursive: true });
  }

  startScheduler(): void {
    void this.ensureFreshOnBoot();
    this.refreshTimer = setInterval(() => {
      void this.refresh("scheduled");
    }, HOT_TOPICS_REFRESH_MS);
    logInfo("hot_topics.scheduler_started", { intervalMs: HOT_TOPICS_REFRESH_MS });
  }

  stopScheduler(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getFeed(): HotTopicsFeed {
    const cached = this.memoryCache ?? this.readCacheFile();
    if (!cached || cached.topics.length === 0) {
      throw new Error("HOT_TOPICS_NOT_READY");
    }
    return cached;
  }

  async refresh(reason: "boot" | "scheduled" | "manual" = "manual"): Promise<HotTopicsFeed> {
    if (this.refreshing) {
      throw new Error("HOT_TOPICS_REFRESH_IN_PROGRESS");
    }
    if (!this.ai.isConfigured()) {
      throw new Error("AI_NOT_CONFIGURED");
    }

    this.refreshing = true;
    const started = Date.now();
    try {
      const trends = await this.sources.fetchAll();
      const batchId = `${Date.now()}-${nanoid()}`;
      const topics = await this.ai.generateQuestions(trends, batchId);
      const now = Date.now();
      const feed: HotTopicsFeed = {
        updatedAt: now,
        nextRefreshAt: now + HOT_TOPICS_REFRESH_MS,
        topics,
        sourceTrendCount: trends.length,
      };
      this.writeCacheFile(feed);
      this.memoryCache = feed;
      logInfo("hot_topics.refreshed", {
        reason,
        topicCount: topics.length,
        sourceTrendCount: trends.length,
        elapsedMs: Date.now() - started,
      });
      return feed;
    } catch (error) {
      logError("hot_topics.refresh_failed", {
        reason,
        message: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - started,
      });
      throw error;
    } finally {
      this.refreshing = false;
    }
  }

  private async ensureFreshOnBoot(): Promise<void> {
    const cached = this.readCacheFile();
    if (cached) {
      this.memoryCache = cached;
    }
    const stale = !cached || Date.now() >= cached.nextRefreshAt;
    if (!stale) {
      logInfo("hot_topics.cache_fresh", { updatedAt: cached!.updatedAt, nextRefreshAt: cached!.nextRefreshAt });
      return;
    }
    try {
      await this.refresh("boot");
    } catch (error) {
      logError("hot_topics.boot_refresh_failed", {
        message: error instanceof Error ? error.message : String(error),
        hasCache: Boolean(cached?.topics.length),
      });
    }
  }

  private cachePath(): string {
    return path.join(HOT_TOPICS_DIR, CACHE_FILE);
  }

  private readCacheFile(): HotTopicsFeed | null {
    const full = this.cachePath();
    if (!fs.existsSync(full)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(full, "utf8")) as HotTopicsFeed;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.topics)) return null;
      return raw;
    } catch {
      return null;
    }
  }

  private writeCacheFile(feed: HotTopicsFeed): void {
    const full = this.cachePath();
    const tmp = path.join(HOT_TOPICS_DIR, `.tmp-${nanoid()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(feed, null, 2), "utf8");
    fs.renameSync(tmp, full);
  }
}
