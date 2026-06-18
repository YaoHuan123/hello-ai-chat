import type { RelationType } from "../src/constants/relationTypes";
import { defaultInfoItemsForMol, defaultSummaryForMol } from "../src/constants/molPersonaDefaults";
import { AiReplyService } from "../src/services/aiReply.service";

const BAD_PATTERNS = [
  /麦乐鸡|香芋派|薯条|冰淇淋|巨无霸|板烧/i,
  /书包|校门口|上课|课间|教室/i,
  /肚子里的蛔虫|早就想吃|也想吃|正想吃/i,
];

type BenchCase = {
  id: string;
  peerText: string;
  relationType: RelationType;
};

const SCENES: BenchCase[] = [
  { id: "read_no_reply", peerText: "你刚才是不是已读不回", relationType: "ambiguous" },
  { id: "nickname_probe", peerText: "你别老叫我「同学」", relationType: "ambiguous" },
  { id: "jealous_oh", peerText: "你今天跟谁吃饭去了", relationType: "ambiguous" },
  { id: "weekend_tease", peerText: "周末干嘛", relationType: "friend" },
];

const MOL_IDS = ["tsundere", "chaoyou", "baobao"] as const;

function buildPersonaBlock(molId: string): string {
  const category = "朋友社交";
  const name = molId;
  const summary = defaultSummaryForMol(molId, category);
  const items = defaultInfoItemsForMol(molId, category);
  const lines = [`[${name}] 简介: ${summary}`];
  for (const it of items) {
    lines.push(`[${name}] ${it.title}: ${it.body}`);
  }
  return lines.join("\n");
}

function collectBadHits(suggestions: string[]): { pattern: string; text: string }[] {
  return BAD_PATTERNS.flatMap((re) =>
    suggestions.filter((s) => re.test(s)).map((text) => ({ pattern: re.source, text })),
  );
}

async function main(): Promise<void> {
  const svc = new AiReplyService();
  if (!svc.isConfigured()) {
    console.error("AI_NOT_CONFIGURED");
    process.exit(1);
  }

  const results: Record<string, unknown>[] = [];
  let badTotal = 0;

  for (const scene of SCENES) {
    for (const molId of MOL_IDS) {
      const lastMessages = [{ from: "peer" as const, text: scene.peerText, ts: Date.now() }];
      const t0 = Date.now();
      const suggestions = await svc.suggestReplies({
        personaBlock: buildPersonaBlock(molId),
        lastMessages,
        relationType: scene.relationType,
        molId,
      });
      const ms = Date.now() - t0;
      const badHits = collectBadHits(suggestions);
      badTotal += badHits.length;
      results.push({
        scene: scene.id,
        molId,
        relationType: scene.relationType,
        ms,
        suggestions,
        badHits,
      });
    }
  }

  console.log(JSON.stringify({ caseCount: results.length, badTotal, results }, null, 2));
  if (badTotal > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
