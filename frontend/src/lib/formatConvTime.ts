export function formatConvTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfTarget) / 86400000);

  if (dayDiff === 0) {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) return "昨天";
  if (dayDiff < 7) {
    return d.toLocaleDateString("zh-CN", { weekday: "short" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" });
}
