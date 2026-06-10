import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  TEXT2IMG_API_KEY,
  TEXT2IMG_BASE_URL,
  TEXT2IMG_MODEL,
  TEXT2IMG_SIZE,
  TEXT2IMG_TIMEOUT_MS,
} from "../config";
import { logWarn } from "../logger";

const MAX_PHRASE_LEN = 120;

export class AvatarText2ImgService {
  isConfigured(): boolean {
    return this.apiKey().length > 0 && TEXT2IMG_MODEL.length > 0;
  }

  async generateFromPhrase(phraseRaw: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error("AI_NOT_CONFIGURED");
    }

    const phrase = normalizePhrase(phraseRaw);
    if (!phrase) {
      throw new Error("INVALID_PHRASE");
    }

    const prompt = buildAvatarPrompt(phrase);
    const url = `${TEXT2IMG_BASE_URL}/images/generations`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEXT2IMG_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT2IMG_MODEL,
          prompt,
          n: 1,
          size: TEXT2IMG_SIZE,
          response_format: "url",
          sequential_image_generation: "disabled",
          watermark: false,
        }),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("TEXT2IMG_TIMEOUT");
      }
      logWarn("avatar_text2img.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
      throw new Error("TEXT2IMG_PROVIDER_ERROR");
    } finally {
      clearTimeout(timer);
    }

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        typeof raw.error === "object" && raw.error !== null
          ? String((raw.error as { message?: string }).message ?? "")
          : "";
      logWarn("avatar_text2img.provider_error", { status: res.status, msg, body: raw });
      throw new Error("TEXT2IMG_PROVIDER_ERROR");
    }

    const imageUrl = extractImageUrl(raw);
    if (!imageUrl) {
      throw new Error("TEXT2IMG_PARSE_ERROR");
    }

    return downloadImage(imageUrl);
  }
  private apiKey(): string {
    return TEXT2IMG_API_KEY || OPENAI_API_KEY;
  }
}

function normalizePhrase(input: string): string {
  const t = input.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.slice(0, MAX_PHRASE_LEN);
}

function buildAvatarPrompt(phrase: string): string {
  return [
    "Square chat app profile avatar, centered composition, minimalist style.",
    "Simple flat illustration, clean lines, limited color palette, uncluttered.",
    "No photorealism, no complex textures, no busy details.",
    "Mood inspired by this user quote (do not render any text in the image):",
    `"${phrase}"`,
    "Plain or soft gradient background, no watermark, no letters, no UI elements.",
  ].join(" ");
}

function extractImageUrl(raw: Record<string, unknown>): string | null {
  const data = raw.data;
  if (!Array.isArray(data) || data.length < 1) return null;
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  const url = (first as { url?: unknown }).url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error("TEXT2IMG_DOWNLOAD_FAILED");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) {
      throw new Error("TEXT2IMG_DOWNLOAD_FAILED");
    }
    return buf;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith("TEXT2IMG_")) throw e;
    logWarn("avatar_text2img.download_failed", { message: e instanceof Error ? e.message : String(e) });
    throw new Error("TEXT2IMG_DOWNLOAD_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

export { MAX_PHRASE_LEN, normalizePhrase };
