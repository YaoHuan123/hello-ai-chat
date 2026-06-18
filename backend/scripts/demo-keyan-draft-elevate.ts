/**
 * 科研圣体 · 草稿升维 Demo（不经过生产 AiReplyService）
 *
 * 用法:
 *   cd backend
 *   npx ts-node scripts/demo-keyan-draft-elevate.ts
 *   npx ts-node scripts/demo-keyan-draft-elevate.ts --variant=elevate-v1
 *   npx ts-node scripts/demo-keyan-draft-elevate.ts --variant=elevate-v1 --draft="去吃翔吧"
 *   npx ts-node scripts/demo-keyan-draft-elevate.ts --temperature=0.9
 *
 * 调试: 只改 data/demo/keyan-draft-elevate/*.txt 与 cases.json，无需动业务代码。
 */

import fs from "fs";
import path from "path";
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../src/config";
import { disableDoubaoThinking } from "../src/services/openaiCompat";
import { pickSuggestChatContext } from "../src/constants/suggestChatContext";

const DEMO_DIR = path.join(process.cwd(), "data", "demo", "keyan-draft-elevate");
const OUTPUT_DIR = path.join(process.cwd(), "data", "demo-output");

type DemoCase = {
  id: string;
  userDraft: string;
  peerText?: string;
  peerMessages?: string[];
};

type VariantConfig = {
  id: string;
  personaFile: string;
  suggestBlockFile: string;
  draftInstructionFile: string;
};

const VARIANTS: VariantConfig[] = [
  {
    id: "current",
    personaFile: "persona-current.txt",
    suggestBlockFile: "suggest-block-v1.txt",
    draftInstructionFile: "draft-instruction-v1.txt",
  },
  {
    id: "elevate-v1",
    personaFile: "persona-elevate-v1.txt",
    suggestBlockFile: "suggest-block-v1.txt",
    draftInstructionFile: "draft-instruction-v1.txt",
  },
];

const VULGAR_PATTERN = /翔|屎|粪|拉屎|吃屎/u;
const SCIENCE_PATTERN = /分子|化学反应|代谢|产物|降解|采样|实验|重组|相变|对照|终产物|体外|聚合|盲测|样本/u;
const CORPORATE_PATTERN = /对齐|汇报|进展|方案|责任人|交付/u;

const SYSTEM_TEMPLATE = `你是中文对话助手，根据「人格资料」与下方聊天摘录，生成「我」接下来可以发送的回复候选。
必须只输出一个 JSON 对象，键为 suggestions，值为字符串数组；数组长度 1 到 3；每条不超过 30 个汉字或等效长度，不要换行分段、不要编号、不要解释、不要思考过程。
内容须符合人格资料中的风格与边界；风格不得突破下列事实边界。

【人格资料】
{{PERSONA_BLOCK}}

{{GROUNDING_RULES}}
`;

const USER_TEMPLATE = `{{USER_DRAFT_SECTION}}【最近聊天】（仅含对方最近 3 条与本人最近 3 条，按时间顺序）
{{CHAT_HISTORY}}

请基于「我」的人格生成 1-3 条我接下来可发出的中文回复，输出 JSON：{"suggestions":["..."]}
`;

function readDemoFile(name: string): string {
  const full = path.join(DEMO_DIR, name);
  if (!fs.existsSync(full)) throw new Error(`DEMO_FILE_MISSING:${full}`);
  return fs.readFileSync(full, "utf8").trimEnd();
}

function loadCases(): DemoCase[] {
  const raw = readDemoFile("cases.json");
  const parsed = JSON.parse(raw) as DemoCase[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("cases.json empty");
  return parsed;
}

function parseArgs(argv: string[]): {
  variant?: string;
  draft?: string;
  caseId?: string;
  temperature: number;
} {
  let variant: string | undefined;
  let draft: string | undefined;
  let caseId: string | undefined;
  let temperature = 0.88;

  for (const arg of argv) {
    if (arg.startsWith("--variant=")) variant = arg.slice("--variant=".length).trim();
    else if (arg.startsWith("--draft=")) draft = arg.slice("--draft=".length).trim();
    else if (arg.startsWith("--case=")) caseId = arg.slice("--case=".length).trim();
    else if (arg.startsWith("--temperature=")) {
      const n = Number.parseFloat(arg.slice("--temperature=".length));
      if (Number.isFinite(n)) temperature = n;
    }
  }
  return { variant, draft, caseId, temperature };
}

function formatChatHistory(peerText: string | undefined, peerMessages?: string[]): string {
  const now = Date.now();
  const lines: { from: "me" | "peer"; text: string; ts: number }[] = [];
  if (peerMessages?.length) {
    peerMessages.forEach((text, i) => {
      lines.push({ from: "peer", text, ts: now - (peerMessages.length - i) * 1000 });
    });
  } else if (peerText?.trim()) {
    lines.push({ from: "peer", text: peerText.trim(), ts: now - 1000 });
  }
  const picked = pickSuggestChatContext(lines);
  if (picked.length === 0) return "（尚无消息）";
  return picked.map((m) => `[${m.from === "me" ? "我" : "对方"}] ${m.text.replace(/\s+/g, " ").trim()}`).join("\n");
}

function formatDraftSection(template: string, userDraft: string): string {
  const draft = userDraft.trim();
  if (!draft) return "";
  return template.replaceAll("{{USER_DRAFT}}", draft);
}

function buildPrompts(variant: VariantConfig, userDraft: string, peerText?: string, peerMessages?: string[]): {
  system: string;
  user: string;
} {
  const persona = readDemoFile(variant.personaFile);
  const grounding = readDemoFile(variant.suggestBlockFile);
  const draftTpl = readDemoFile(variant.draftInstructionFile);
  const system = SYSTEM_TEMPLATE.replaceAll("{{PERSONA_BLOCK}}", persona).replaceAll("{{GROUNDING_RULES}}", grounding);
  const user = USER_TEMPLATE.replaceAll("{{USER_DRAFT_SECTION}}", formatDraftSection(draftTpl, userDraft)).replaceAll(
    "{{CHAT_HISTORY}}",
    formatChatHistory(peerText, peerMessages),
  );
  return { system, user };
}

type ScoreResult = {
  status: "pass" | "warn" | "fail";
  reasons: string[];
};

function scoreSuggestions(suggestions: string[], variantId: string): ScoreResult {
  const reasons: string[] = [];
  let status: ScoreResult["status"] = "pass";

  for (const s of suggestions) {
    if (VULGAR_PATTERN.test(s)) {
      reasons.push(`FAIL: 含粗俗原词 → ${s}`);
      status = "fail";
    }
    if (s.length > 30) {
      reasons.push(`WARN: 超过 30 字 (${s.length}) → ${s}`);
      if (status !== "fail") status = "warn";
    }
  }

  const hasScience = suggestions.some((s) => SCIENCE_PATTERN.test(s));
  const allCorporate = suggestions.every((s) => CORPORATE_PATTERN.test(s));

  if (variantId === "elevate-v1") {
    if (!hasScience) {
      reasons.push("WARN: elevate-v1 未命中科研/化学升维关键词");
      if (status !== "fail") status = "warn";
    }
  }
  if (allCorporate && !hasScience) {
    reasons.push("WARN: 输出偏职场汇报，缺少科研梗");
    if (status !== "fail") status = "warn";
  }
  if (reasons.length === 0) {
    reasons.push("PASS: 启发式检查通过");
  }
  return { status, reasons };
}

async function callLlm(system: string, user: string, temperature: number): Promise<{ suggestions: string[]; raw: string; ms: number }> {
  if (!OPENAI_API_KEY.trim()) throw new Error("AI_NOT_CONFIGURED");

  const url = `${OPENAI_BASE_URL}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  disableDoubaoThinking(body);

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const ms = Date.now() - t0;
  const rawJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof rawJson.error === "object" && rawJson.error !== null
        ? String((rawJson.error as { message?: string }).message ?? "")
        : "";
    throw new Error(`AI_PROVIDER_ERROR: HTTP ${res.status} ${msg}`.trim());
  }

  const choices = rawJson.choices as unknown;
  if (!Array.isArray(choices) || choices.length < 1) throw new Error("AI_PARSE_ERROR: missing choices");
  const content = (choices[0] as { message?: { content?: string } })?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI_PARSE_ERROR: empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    throw new Error(`AI_PARSE_ERROR: invalid JSON → ${content.trim().slice(0, 200)}`);
  }

  const arr = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(arr)) throw new Error("AI_PARSE_ERROR: missing suggestions array");

  const suggestions = arr.filter((item): item is string => typeof item === "string").map((s) => s.trim()).filter(Boolean);
  if (suggestions.length === 0) throw new Error("AI_PARSE_ERROR: empty suggestions");

  return { suggestions, raw: content.trim(), ms };
}

function appendJsonl(record: unknown): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(OUTPUT_DIR, `keyan-draft-elevate-${date}.jsonl`);
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

async function runCase(
  variant: VariantConfig,
  demoCase: DemoCase,
  temperature: number,
): Promise<{ fail: boolean; record: Record<string, unknown> }> {
  const { system, user } = buildPrompts(variant, demoCase.userDraft, demoCase.peerText, demoCase.peerMessages);
  const { suggestions, raw, ms } = await callLlm(system, user, temperature);
  const score = scoreSuggestions(suggestions, variant.id);

  console.log(`\n--- ${variant.id} / ${demoCase.id} (${ms}ms) [${score.status}] ---`);
  console.log(`draft: ${demoCase.userDraft}`);
  suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  score.reasons.forEach((r) => console.log(`  · ${r}`));

  const record = {
    ts: new Date().toISOString(),
    variant: variant.id,
    caseId: demoCase.id,
    userDraft: demoCase.userDraft,
    peerText: demoCase.peerText,
    temperature,
    model: OPENAI_MODEL,
    ms,
    suggestions,
    score,
    input: { system, user },
    outputRaw: raw,
  };
  appendJsonl(record);
  return { fail: score.status === "fail", record };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let cases = loadCases();

  if (args.caseId) {
    cases = cases.filter((c) => c.id === args.caseId);
    if (cases.length === 0) throw new Error(`case not found: ${args.caseId}`);
  }
  if (args.draft) {
    cases = [{ id: "custom", userDraft: args.draft, peerText: cases[0]?.peerText ?? "周末干嘛" }];
  }

  let variants = VARIANTS;
  if (args.variant) {
    variants = VARIANTS.filter((v) => v.id === args.variant);
    if (variants.length === 0) throw new Error(`unknown variant: ${args.variant}`);
  }

  console.log(`demo dir: ${DEMO_DIR}`);
  console.log(`model: ${OPENAI_MODEL}, temperature: ${args.temperature}`);
  console.log(`variants: ${variants.map((v) => v.id).join(", ")}`);
  console.log(`cases: ${cases.map((c) => c.id).join(", ")}`);

  let failCount = 0;
  const results: Record<string, unknown>[] = [];

  for (const variant of variants) {
    for (const demoCase of cases) {
      const { fail, record } = await runCase(variant, demoCase, args.temperature);
      if (fail) failCount += 1;
      results.push(record);
    }
  }

  console.log(`\n=== summary: ${results.length} runs, ${failCount} fail ===`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
