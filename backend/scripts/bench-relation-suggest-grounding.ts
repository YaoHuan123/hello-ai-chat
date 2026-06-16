import { AiReplyService } from "../src/services/aiReply.service";

const BAD_PATTERNS = [
  /麦乐鸡|香芋派|薯条|冰淇淋|巨无霸|板烧/i,
  /书包|校门口|上课|课间|教室/i,
  /肚子里的蛔虫|早就想吃|也想吃|正想吃/i,
];

async function main(): Promise<void> {
  const svc = new AiReplyService();
  if (!svc.isConfigured()) {
    console.error("AI_NOT_CONFIGURED");
    process.exit(1);
  }

  const lastMessages = [{ from: "peer" as const, text: "我请你吃麦当劳吧", ts: Date.now() }];
  const t0 = Date.now();
  const suggestions = await svc.suggestRepliesByRelation({
    relationType: "classmate",
    lastMessages,
  });
  const ms = Date.now() - t0;

  const hits = BAD_PATTERNS.flatMap((re) =>
    suggestions.filter((s) => re.test(s)).map((s) => ({ pattern: re.source, text: s })),
  );

  console.log(JSON.stringify({ ms, suggestions, badHits: hits }, null, 2));
  if (hits.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
