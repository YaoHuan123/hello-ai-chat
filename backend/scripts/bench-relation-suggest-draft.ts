import { AiReplyService } from "../src/services/aiReply.service";

const BAD_PATTERNS = [/麦当劳|麦乐鸡|门口等你/i];

async function main(): Promise<void> {
  const svc = new AiReplyService();
  if (!svc.isConfigured()) {
    console.error("AI_NOT_CONFIGURED");
    process.exit(1);
  }

  const lastMessages = [{ from: "peer" as const, text: "我请你吃麦当劳吧", ts: Date.now() }];
  const t0 = Date.now();
  const suggestions = await svc.suggestRepliesByRelation({
    relationType: "ambiguous",
    lastMessages,
    userDraft: "下午6点，万达",
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
