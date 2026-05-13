import type { MolCatalogItem } from "../services/stageApi";

const norm = (s: string) => s.toLowerCase().trim();

/** 可检索字段展平为一段文本，供匹配与计分。 */
function haystack(m: MolCatalogItem): string {
  return [
    m.name,
    m.summary,
    m.primaryCategory,
    ...(m.taskTags ?? []),
    ...(m.toneTags ?? []),
    ...(m.relationshipTags ?? []),
    ...(m.abilityTags ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * 方案排序：名称完全匹配 > 场景/任务等标签命中 > 已拥有(可选) > 热门分。
 * recentScene 用于弱加权（当前用户常用场景），mock 可传 null。
 */
export function scoreMolSearch(m: MolCatalogItem, q: string, recentScene: string | null): number {
  if (!q.trim()) return 1;
  const query = norm(q);
  if (!query) return 1;

  let s = 0;
  if (norm(m.name) === query) s += 100;
  else if (norm(m.name).includes(query)) s += 50;
  else if (m.name.toLowerCase().startsWith(query)) s += 45;

  if (m.primaryCategory && norm(m.primaryCategory).includes(query)) s += 35;
  if (m.summary && m.summary.toLowerCase().includes(query)) s += 20;

  const h = haystack(m);
  if (h.includes(query)) s += 15;

  for (const t of m.taskTags ?? []) {
    if (norm(t).includes(query) || (query.length >= 2 && query.includes(norm(t)))) s += 30;
  }
  for (const t of m.toneTags ?? []) {
    if (norm(t).includes(query)) s += 12;
  }
  for (const t of m.relationshipTags ?? []) {
    if (norm(t).includes(query) || (query.length >= 2 && query.includes(norm(t)))) s += 12;
  }
  for (const t of m.abilityTags ?? []) {
    if (norm(t).includes(query)) s += 10;
  }

  if (s < 0.1) {
    return 0;
  }

  if (recentScene && m.primaryCategory === recentScene) s += 8;
  s += (m.popularityScore ?? 0) * 0.01;
  if (m.owned) s += 5;
  if (m.recommended) s += 3;
  return s;
}

export function searchAndRankMols(
  items: MolCatalogItem[],
  query: string,
  options?: { recentScene: string | null; minScore?: number },
): MolCatalogItem[] {
  const q = query.trim();
  if (!q) {
    return [...items].sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
  }
  const min = options?.minScore ?? 0.1;
  const recent = options?.recentScene ?? null;
  return [...items]
    .map((m) => ({ m, score: scoreMolSearch(m, q, recent) }))
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);
}

/** 无结果时给改搜词：优先展示与当前输入不同的推荐词。 */
export function getSearchFallbackSuggestions(
  _items: MolCatalogItem[],
  query: string,
  chips: string[],
): string[] {
  const q = norm(query);
  if (!q) return chips.slice(0, 4);
  return chips
    .filter((c) => norm(c) !== q)
    .slice(0, 4);
}
