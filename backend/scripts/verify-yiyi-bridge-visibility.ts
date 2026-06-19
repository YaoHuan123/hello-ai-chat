import { filterBridgeTranscriptForViewer } from "../src/services/yiyi.service";
import type { YiyiBridgeTranscriptLine } from "../src/types/yiyi";

const USER_A = "user-a";
const USER_B = "user-b";

const transcript: YiyiBridgeTranscriptLine[] = [
  { from: "a", text: "A 侧 YiYi 发言", ts: 1 },
  { from: "b", text: "B 侧 YiYi 发言", ts: 2 },
  { from: "a", text: "A 侧再次发言", ts: 3 },
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const forA = filterBridgeTranscriptForViewer(USER_A, USER_A, transcript);
  assert(forA.length === 2, "user A should see 2 own lines");
  assert(forA.every((line) => line.from === "a"), "user A must not see b-side lines");
  assert(!forA.some((line) => line.text.includes("B 侧")), "user A must not see B-side text");

  const forB = filterBridgeTranscriptForViewer(USER_B, USER_A, transcript);
  assert(forB.length === 1, "user B should see 1 own line");
  assert(forB.every((line) => line.from === "b"), "user B must not see a-side lines");
  assert(!forB.some((line) => line.text.includes("A 侧")), "user B must not see A-side text");

  console.log(JSON.stringify({ ok: true, forA: forA.length, forB: forB.length }, null, 2));
}

main();
