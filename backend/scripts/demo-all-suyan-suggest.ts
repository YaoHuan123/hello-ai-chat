/**
 * 全素颜 · 场景矩阵 Demo
 *
 * 每个对话场景会对 catalog 中全部素颜各跑一遍（场景 × 素颜）。
 *
 * 用法:
 *   cd backend
 *   npx ts-node scripts/demo-all-suyan-suggest.ts
 *   npx ts-node scripts/demo-all-suyan-suggest.ts --list
 *   npx ts-node scripts/demo-all-suyan-suggest.ts --scenario=xiang_weekend,hotpot_invite
 *   npx ts-node scripts/demo-all-suyan-suggest.ts --only=tsundere,keyan
 *   npx ts-node scripts/demo-all-suyan-suggest.ts --baseline
 *   npx ts-node scripts/demo-all-suyan-suggest.ts --dry-run
 *
 * 数据:
 *   data/demo/all-suyan/scenarios.json      对话场景（改这里加用例）
 *   data/demo/all-suyan/suyan-catalog.json    素颜列表
 *   data/demo/all-suyan/personas/{id}.txt     强化人格
 *   data/demo/all-suyan/suggest-blocks/{id}.txt
 *
 * 输出:
 *   data/demo-output/all-suyan-suggest-{elevate|baseline}-{date}.txt
 *   data/demo-output/all-suyan-suggest-{elevate|baseline}-{date}.jsonl
 */

import fs from "fs";
import path from "path";
import type { RelationType } from "../src/constants/relationTypes";
import { isValidRelationType, RELATION_LABELS } from "../src/constants/relationTypes";
import { pickSuggestChatContext } from "../src/constants/suggestChatContext";
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../src/config";
import {
  buildEntertainmentRelationBlock,
  buildEntertainmentSuggestBlock,
  buildSuggestRelationLine,
  shouldBoostEntertainment,
  entertainmentSuggestTemperature,
} from "../src/constants/molEntertainmentSuggest";
import { loadPromptFile } from "../src/services/promptLoader";
import { loadMolSuggestSystemTemplate, loadMolSuggestUserTemplate } from "../src/services/molSuggestPromptFiles";
import { disableDoubaoThinking } from "../src/services/openaiCompat";
import { ensureSettingsFilesSeeded, loadSuyanPreset } from "../src/services/settingsRuntime.service";

const DEMO_DIR = path.join(process.cwd(), "data", "demo", "all-suyan");
const SCENARIOS_FILE = path.join(DEMO_DIR, "scenarios.json");
const CATALOG_FILE = path.join(DEMO_DIR, "suyan-catalog.json");
const PERSONAS_DIR = path.join(DEMO_DIR, "personas");
const SUGGEST_BLOCKS_DIR = path.join(DEMO_DIR, "suggest-blocks");
const SHARED_DIR = path.join(DEMO_DIR, "shared");
const OUTPUT_DIR = path.join(process.cwd(), "data", "demo-output");

type Scenario = {
  id: string;
  title: string;
  peerText: string;
  userDraft: string;
  relationType?: string;
};

type SuyanEntry = {
  suyanId: string;
  suyanName: string;
};

type RunResult = {
  scenarioId: string;
  scenarioTitle: string;
  suyanId: string;
  suyanName: string;
  userDraft: string;
  peerText: string;
  relationType: RelationType | null;
  suggestions: string[];
  ms: number;
  mode: "elevate" | "baseline";
  error?: string;
};

function readOptionalFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8").trimEnd();
}

function readRequiredShared(name: string): string {
  const full = path.join(SHARED_DIR, name);
  const content = readOptionalFile(full);
  if (!content) throw new Error(`DEMO_SHARED_MISSING:${full}`);
  return content;
}

function loadScenarios(): Scenario[] {
  const raw = fs.readFileSync(SCENARIOS_FILE, "utf8");
  const parsed = JSON.parse(raw) as Scenario[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("scenarios.json empty");
  return parsed;
}

function loadSuyanCatalog(): SuyanEntry[] {
  const raw = fs.readFileSync(CATALOG_FILE, "utf8");
  const parsed = JSON.parse(raw) as SuyanEntry[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("suyan-catalog.json empty");
  return parsed;
}

function parseArgs(argv: string[]): {
  only?: Set<string>;
  scenario?: Set<string>;
  temperature: number;
  baseline: boolean;
  dryRun: boolean;
  list: boolean;
} {
  let only: Set<string> | undefined;
  let scenario: Set<string> | undefined;
  let temperature = 0.92;
  let baseline = false;
  let dryRun = false;
  let list = false;
  for (const arg of argv) {
    if (arg === "--baseline") baseline = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--list") list = true;
    else if (arg.startsWith("--only=")) {
      only = new Set(
        arg
          .slice("--only=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (arg.startsWith("--scenario=")) {
      scenario = new Set(
        arg
          .slice("--scenario=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (arg.startsWith("--temperature=")) {
      const n = Number.parseFloat(arg.slice("--temperature=".length));
      if (Number.isFinite(n)) temperature = n;
    }
  }
  return { only, scenario, temperature, baseline, dryRun, list };
}

function buildPersonaBlock(suyanId: string, suyanName: string, baseline: boolean): string {
  if (!baseline) {
    const elevated = readOptionalFile(path.join(PERSONAS_DIR, `${suyanId}.txt`));
    if (elevated) return elevated;
  }
  const preset = loadSuyanPreset(suyanId);
  const lines: string[] = [`[${suyanName}] 简介: ${preset.summary}`];
  for (const it of preset.infoItems) {
    lines.push(`[${suyanName}] ${it.title}: ${it.body}`);
  }
  return lines.join("\n");
}

function formatChatHistory(peerText: string): string {
  const now = Date.now();
  const picked = pickSuggestChatContext([{ from: "peer", text: peerText.trim(), ts: now - 1000 }]);
  if (picked.length === 0) return "（尚无消息）";
  return picked.map((m) => `[对方] ${m.text.replace(/\s+/g, " ").trim()}`).join("\n");
}

function formatUserDraftSection(userDraft: string, baseline: boolean): string {
  const draft = userDraft.trim();
  if (!draft) return "";
  if (!baseline) {
    const tpl = readRequiredShared("draft-instruction.txt");
    return tpl.replaceAll("{{USER_DRAFT}}", draft);
  }
  return `【我正在输入的回复（尚未发送，须优先承接）】
${draft}

须基于上述草稿生成建议：可补语气或少量衔接，但不得改动或无视草稿中的时间、地点与态度。草稿里的时间、地点即为准；若草稿已足够完整，可直接润色后输出。

`;
}

function buildGroundingRules(suyanId: string, relationType: RelationType | null, baseline: boolean): string {
  const entertainmentBoost = shouldBoostEntertainment(`mw-seed-${suyanId}`, relationType);
  const entertainmentBlock =
    entertainmentBoost && relationType ? `${buildEntertainmentSuggestBlock(relationType)}\n` : "";

  if (!baseline) {
    const base = readRequiredShared("suggest-block-base.txt");
    const specific = readOptionalFile(path.join(SUGGEST_BLOCKS_DIR, `${suyanId}.txt`));
    return `${entertainmentBlock}${base}\n${specific ?? ""}`.trimEnd();
  }
  return `${entertainmentBlock}${loadPromptFile("relation-suggest-grounding-rules.txt")}`;
}

function buildRelationLine(suyanId: string, relationType: RelationType | null): string {
  if (!relationType || !RELATION_LABELS[relationType]) return "";
  const entertainmentBoost = shouldBoostEntertainment(`mw-seed-${suyanId}`, relationType);
  if (entertainmentBoost) return buildEntertainmentRelationBlock(relationType);
  return buildSuggestRelationLine(relationType);
}

function buildPrompts(
  personaBlock: string,
  userDraft: string,
  peerText: string,
  suyanId: string,
  relationType: RelationType | null,
  baseline: boolean,
): { system: string; user: string } {
  const relationLine = buildRelationLine(suyanId, relationType);
  const grounding = buildGroundingRules(suyanId, relationType, baseline);
  const systemTpl = baseline ? loadMolSuggestSystemTemplate() : readRequiredShared("system-template.txt");
  const system = (relationLine + systemTpl.replaceAll("{{PERSONA_BLOCK}}", personaBlock || "（无额外资料）"))
    .replaceAll("{{GROUNDING_RULES}}", grounding)
    .trimEnd();
  const user = loadMolSuggestUserTemplate()
    .replaceAll("{{USER_DRAFT_SECTION}}", formatUserDraftSection(userDraft, baseline))
    .replaceAll("{{CHAT_HISTORY}}", formatChatHistory(peerText))
    .trimEnd();
  return { system, user };
}

async function callLlm(
  system: string,
  user: string,
  temperature: number,
  suyanId: string,
  relationType: RelationType | null,
  baseline: boolean,
): Promise<{ suggestions: string[]; ms: number }> {
  if (!OPENAI_API_KEY.trim()) throw new Error("AI_NOT_CONFIGURED");

  const entertainmentBoost = shouldBoostEntertainment(`mw-seed-${suyanId}`, relationType);
  const effectiveTemp = entertainmentBoost ? entertainmentSuggestTemperature() : temperature;

  const url = `${OPENAI_BASE_URL}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    temperature: baseline ? Math.min(temperature, 0.88) : effectiveTemp,
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
  if (!Array.isArray(choices) || choices.length < 1) throw new Error("AI_PARSE_ERROR");
  const content = (choices[0] as { message?: { content?: string } })?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI_PARSE_ERROR");

  const parsed = JSON.parse(content.trim()) as { suggestions?: unknown };
  const arr = parsed.suggestions;
  if (!Array.isArray(arr)) throw new Error("AI_PARSE_ERROR");

  const suggestions = arr
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (suggestions.length === 0) throw new Error("AI_PARSE_ERROR");

  return { suggestions, ms };
}

function formatSuyanResultLine(result: RunResult): string {
  const lines = [`【素颜】${result.suyanName}（${result.suyanId}）`];
  if (result.error) {
    lines.push(`  （失败: ${result.error}）`);
    return lines.join("\n");
  }
  result.suggestions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  return lines.join("\n");
}

function formatScenarioReport(scenario: Scenario, results: RunResult[]): string {
  const rel = scenario.relationType && isValidRelationType(scenario.relationType) ? RELATION_LABELS[scenario.relationType as RelationType] : "—";
  const header = [
    `${"═".repeat(56)}`,
    `场景：${scenario.title}（${scenario.id}）`,
    `关系：${rel}`,
    `【对方】${scenario.peerText}`,
    `【测试用语（草稿）】${scenario.userDraft}`,
    "",
  ];
  const body = results.map(formatSuyanResultLine).join("\n\n");
  return `${header.join("\n")}${body}`;
}

async function runMatrixCell(
  scenario: Scenario,
  suyan: SuyanEntry,
  temperature: number,
  baseline: boolean,
): Promise<RunResult> {
  const relationType =
    scenario.relationType && isValidRelationType(scenario.relationType)
      ? (scenario.relationType as RelationType)
      : null;

  try {
    const personaBlock = buildPersonaBlock(suyan.suyanId, suyan.suyanName, baseline);
    const { system, user } = buildPrompts(
      personaBlock,
      scenario.userDraft,
      scenario.peerText,
      suyan.suyanId,
      relationType,
      baseline,
    );
    const { suggestions, ms } = await callLlm(system, user, temperature, suyan.suyanId, relationType, baseline);
    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      suyanId: suyan.suyanId,
      suyanName: suyan.suyanName,
      userDraft: scenario.userDraft,
      peerText: scenario.peerText,
      relationType,
      suggestions,
      ms,
      mode: baseline ? "baseline" : "elevate",
    };
  } catch (e: unknown) {
    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      suyanId: suyan.suyanId,
      suyanName: suyan.suyanName,
      userDraft: scenario.userDraft,
      peerText: scenario.peerText,
      relationType,
      suggestions: [],
      ms: 0,
      mode: baseline ? "baseline" : "elevate",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function printList(scenarios: Scenario[], suyans: SuyanEntry[]): void {
  console.log(`场景 ${scenarios.length} 个 × 素颜 ${suyans.length} 个 = ${scenarios.length * suyans.length} 次 LLM 调用\n`);
  console.log("场景列表:");
  for (const s of scenarios) {
    console.log(`  ${s.id.padEnd(22)} ${s.title}`);
    console.log(`    对方: ${s.peerText}`);
    console.log(`    草稿: ${s.userDraft}`);
  }
  console.log("\n素颜列表:");
  for (const s of suyans) {
    console.log(`  ${s.suyanId.padEnd(12)} ${s.suyanName}`);
  }
}

async function main(): Promise<void> {
  ensureSettingsFilesSeeded();
  const args = parseArgs(process.argv.slice(2));

  let scenarios = loadScenarios();
  let suyans = loadSuyanCatalog();

  if (args.scenario) {
    scenarios = scenarios.filter((s) => args.scenario!.has(s.id));
    if (scenarios.length === 0) throw new Error(`no scenarios matched --scenario=${[...args.scenario].join(",")}`);
  }
  if (args.only) {
    suyans = suyans.filter((s) => args.only!.has(s.suyanId));
    if (suyans.length === 0) throw new Error(`no suyans matched --only=${[...args.only].join(",")}`);
  }

  if (args.list) {
    printList(scenarios, suyans);
    return;
  }

  const totalRuns = scenarios.length * suyans.length;
  const modeTag = args.baseline ? "baseline" : "elevate";

  if (args.dryRun) {
    printList(scenarios, suyans);
    console.log(`\ndry-run: mode=${modeTag}, 将执行 ${totalRuns} 次调用（未请求 LLM）`);
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const txtPath = path.join(OUTPUT_DIR, `all-suyan-suggest-${modeTag}-${date}.txt`);
  const jsonlPath = path.join(OUTPUT_DIR, `all-suyan-suggest-${modeTag}-${date}.jsonl`);

  console.log(`mode: ${modeTag}, 场景: ${scenarios.length}, 素颜: ${suyans.length}, 总调用: ${totalRuns}`);
  console.log(`model: ${OPENAI_MODEL}, temperature: ${args.temperature}`);
  console.log(`report: ${txtPath}\n`);

  const reportBlocks: string[] = [];
  let failCount = 0;
  let runIndex = 0;

  fs.writeFileSync(jsonlPath, "", "utf8");

  for (const scenario of scenarios) {
    const scenarioResults: RunResult[] = [];

    console.log(`${"═".repeat(56)}`);
    console.log(`场景：${scenario.title}（${scenario.id}）`);
    console.log(`【对方】${scenario.peerText}`);
    console.log(`【测试用语】${scenario.userDraft}\n`);

    for (const suyan of suyans) {
      runIndex += 1;
      process.stdout.write(`[${runIndex}/${totalRuns}] ${scenario.id} × ${suyan.suyanId} … `);

      const result = await runMatrixCell(scenario, suyan, args.temperature, args.baseline);
      scenarioResults.push(result);
      if (result.error) failCount += 1;

      if (result.error) {
        console.log(`失败 (${result.error})`);
      } else {
        console.log(`ok ${result.ms}ms → ${result.suggestions[0]?.slice(0, 40) ?? ""}…`);
      }

      fs.appendFileSync(jsonlPath, `${JSON.stringify({ ts: new Date().toISOString(), ...result })}\n`, "utf8");
    }

    const block = formatScenarioReport(scenario, scenarioResults);
    reportBlocks.push(block);
    console.log("");
  }

  const header = [
    `全素颜场景矩阵报告 [${modeTag}] ${new Date().toISOString()}`,
    `场景 ${scenarios.length} × 素颜 ${suyans.length} = ${totalRuns} 次`,
    `${"=".repeat(56)}`,
    "",
  ].join("\n");
  fs.writeFileSync(txtPath, `${header}${reportBlocks.join("\n\n")}\n`, "utf8");

  console.log(`=== 完成: ${totalRuns} 次调用, ${failCount} 失败 ===`);
  console.log(`txt: ${txtPath}`);
  console.log(`jsonl: ${jsonlPath}`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
