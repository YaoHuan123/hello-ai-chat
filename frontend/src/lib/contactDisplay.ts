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

export function contactAvatarLetter(c: Pick<ContactItem, "phone" | "remark" | "nickname">): string {
  const name = contactDisplayName(c);
  const ch = name.trim().slice(0, 1);
  if (!ch) return "?";
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}
