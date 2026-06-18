export type DailyEntryKind = "photo" | "video" | "text" | "voice";

/** 用户私人日常记录，不对好友或其他用户展示。 */
export type DailyEntry = {
  id: string;
  kind: DailyEntryKind;
  /** 正文或说明 */
  text: string;
  /** 照片 / 视频 / 语音的 data URL */
  mediaUrl?: string;
  /** 视频或语音时长（毫秒） */
  durationMs?: number;
  ts: number;
};

export const DAILY_KIND_LABEL: Record<DailyEntryKind, string> = {
  photo: "照片",
  video: "视频",
  text: "文字",
  voice: "语音",
};
