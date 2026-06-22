import type { ContactItem } from "../types/contact";

export function maskPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

/** 备注优先，其次对方昵称，最后脱敏手机号 */
export function contactDisplayName(c: Pick<ContactItem, "phone" | "remark" | "nickname">): string {
  const remark = c.remark?.trim();
  if (remark) return remark;
  const nickname = c.nickname?.trim();
  if (nickname) return nickname;
  return maskPhoneDisplay(c.phone);
}

export function contactMetaLine(c: Pick<ContactItem, "gender" | "createdAt">): string {
  if (c.gender === "male" || c.gender === "female") {
    return c.gender === "male" ? "男" : "女";
  }
  const d = new Date(c.createdAt);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) {
    return `今天 ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export function contactAvatarLetter(c: Pick<ContactItem, "phone" | "remark" | "nickname">): string {
  const name = contactDisplayName(c);
  const ch = name.trim().slice(0, 1);
  if (!ch) return "?";
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}
