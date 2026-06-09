export type ChatLocalMessage = {
  id: string;
  from: "me" | "other";
  text: string;
  ts: number;
};
