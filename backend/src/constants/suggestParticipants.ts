import type { UserGender } from "./userGender";

function genderPromptLabel(gender: UserGender | null): string {
  if (gender === "male") return "男";
  if (gender === "female") return "女";
  if (gender === "private") return "未透露";
  return "未设置";
}

export function buildSuggestParticipantsBlock(
  meGender: UserGender | null,
  peerGender: UserGender | null,
): string {
  const peerLabel = genderPromptLabel(peerGender);
  const lines = [
    "【对话双方】",
    `- 我：${genderPromptLabel(meGender)}`,
    `- 对方：${peerLabel}`,
    "- 成稿身份：每条是「我」发给对方的消息，直接对对方称「你」，须可一键发送。",
    "- 禁止教练/旁观者句：不得写「你可以…」「问他/她…」「对方这是在…」「回他/回她」等。",
  ];
  if (peerGender === "male" || peerGender === "female") {
    lines.push(`- 对方性别已知（${peerLabel}）：成稿中对聊天对象仍用「你」，勿用他/她/对方指称。`);
  } else {
    lines.push("- 任一方为「未设置」或「未透露」时，勿用性别化称呼或刻板假设。");
  }
  return lines.join("\n");
}

export function applySuggestParticipantsBlock(system: string, block: string): string {
  if (system.includes("{{PARTICIPANTS_BLOCK}}")) {
    return system.replaceAll("{{PARTICIPANTS_BLOCK}}", block);
  }
  if (!block.trim()) return system;
  return `${block}\n\n${system}`;
}
