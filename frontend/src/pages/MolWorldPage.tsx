import { useCallback, useEffect, useMemo, useState } from "react";
import { POPULAR_TASK_SHORTCUTS, PRIMARY_SCENES, SEARCH_SUGGESTION_CHIPS } from "../data/molWorldTaxonomy";
import { getSearchFallbackSuggestions, searchAndRankMols } from "../lib/molWorldSearch";
import { getMolCatalog, purchaseMol, type MolCatalogItem } from "../services/stageApi";

const TONE_CHIPS = ["专业", "温和", "直接", "活泼", "有边界感"] as const;
const REL_CHIPS = ["同事", "领导", "客户", "朋友", "家人", "暧昧对象"] as const;

type Props = { onBack: () => void; onMyMols?: () => void };

function MolCard({
  m,
  buying,
  onBuy,
}: {
  m: MolCatalogItem;
  buying: boolean;
  onBuy: (id: string) => void;
}) {
  return (
    <div className="aichat-card aichat-page-card aichat-mol-tile">
      <div className="aichat-inline-row aichat-inline-row-between aichat-mol-tile__head">
        <h2 className="aichat-panel-title">{m.name}</h2>
        {m.owned ? <span className="aichat-tag-ok">已拥有</span> : <span className="aichat-tag-muted">未解锁</span>}
      </div>
      <p className="aichat-mol-catline">{m.primaryCategory}</p>
      <p className="aichat-card-hint">{m.summary}</p>
      <div className="aichat-tag-wrap">
        {(m.taskTags ?? []).slice(0, 4).map((t) => (
          <span key={t} className="aichat-tag-s">
            {t}
          </span>
        ))}
      </div>
      {!m.owned && (
        <div className="aichat-inline-row aichat-inline-row-between">
          <span className="aichat-price">¥{m.price}</span>
          <button
            type="button"
            className="aichat-btn-primary aichat-btn-fit"
            onClick={() => onBuy(m.id)}
            disabled={buying}
          >
            立即解锁
          </button>
        </div>
      )}
    </div>
  );
}

export function MolWorldPage({ onBack, onMyMols }: Props) {
  const [items, setItems] = useState<MolCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState("");
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [scene, setScene] = useState<(typeof PRIMARY_SCENES)[number]>("全部");
  const [taskTag, setTaskTag] = useState<string | null>(null);
  const [toneFilter, setToneFilter] = useState<string | null>(null);
  const [relFilter, setRelFilter] = useState<string | null>(null);
  const recentScene = scene === "全部" ? null : scene;

  useEffect(() => {
    getMolCatalog()
      .then(setItems)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const applyBaseFilters = useCallback(
    (list: MolCatalogItem[]) => {
      let r = list;
      if (scene !== "全部") {
        r = r.filter((m) => m.primaryCategory === scene);
      }
      if (taskTag) {
        r = r.filter((m) => m.taskTags.includes(taskTag));
      }
      if (toneFilter) {
        r = r.filter((m) => m.toneTags.includes(toneFilter));
      }
      if (relFilter) {
        r = r.filter((m) => m.relationshipTags.includes(relFilter));
      }
      return r;
    },
    [scene, taskTag, toneFilter, relFilter],
  );

  const recommended = useMemo(() => {
    const r = items.filter((m) => m.recommended).sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
    return r.slice(0, 5);
  }, [items]);

  const filteredList = useMemo(() => {
    const base = applyBaseFilters(items);
    if (search.trim()) {
      return searchAndRankMols(base, search, { recentScene });
    }
    return [...base].sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
  }, [items, search, applyBaseFilters, recentScene]);

  const emptySearch = !loading && filteredList.length === 0 && (search.trim() || scene !== "全部" || taskTag || toneFilter || relFilter);
  const fallbackSugs = useMemo(
    () => getSearchFallbackSuggestions(items, search, SEARCH_SUGGESTION_CHIPS),
    [items, search],
  );

  const hasSubFilters = Boolean(taskTag || toneFilter || relFilter);
  const subFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (taskTag) {
      const found = POPULAR_TASK_SHORTCUTS.find((p) => p.taskTag === taskTag);
      parts.push(found ? found.label : taskTag);
    }
    if (toneFilter) parts.push(toneFilter);
    if (relFilter) parts.push(relFilter);
    return parts.length ? parts.join(" · ") : "子筛选未选";
  }, [taskTag, toneFilter, relFilter]);

  function clearSubFilters() {
    setTaskTag(null);
    setToneFilter(null);
    setRelFilter(null);
  }

  async function onBuy(id: string) {
    if (buyingId) return;
    setBuyingId(id);
    setErr("");
    try {
      const next = await purchaseMol(id);
      setItems(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBuyingId("");
    }
  }

  if (loading) {
    return (
      <div className="aichat-shell">
        <header className="aichat-topbar aichat-topbar-flex">
          <button className="aichat-btn-ghost" type="button" onClick={onBack}>
            返回
          </button>
          <div className="aichat-stage-head">
            <h1>Mol 世界</h1>
            <p>选择并解锁能力</p>
          </div>
          {onMyMols ? (
            <button className="aichat-btn-ghost" type="button" onClick={onMyMols}>
              我的
            </button>
          ) : (
            <div className="aichat-topbar-spacer" aria-hidden />
          )}
        </header>
        <div className="aichat-main aichat-page-main">
          <div className="aichat-card">正在加载 Mol...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aichat-shell aichat-molworld">
      <header className="aichat-topbar aichat-topbar-flex">
        <button className="aichat-btn-ghost" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>Mol 世界</h1>
          <p>选择并解锁能力</p>
        </div>
        {onMyMols ? (
          <button className="aichat-btn-ghost" type="button" onClick={onMyMols}>
            我的
          </button>
        ) : (
          <div className="aichat-topbar-spacer" aria-hidden />
        )}
      </header>

      <div className="aichat-main aichat-page-main aichat-molworld-main">
        {err && <p className="aichat-form-msg err">{err}</p>}

        <div className="aichat-molworld-search">
          <input
            className="aichat-input aichat-molworld-search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜场景、关系或任务"
            enterKeyHint="search"
            aria-label="搜索 Mol"
          />
          {search.trim() && (
            <div className="aichat-suggest-row" role="list">
              {SEARCH_SUGGESTION_CHIPS.filter((c) => c.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map((c) => (
                <button key={c} type="button" className="aichat-suggest-chip" onClick={() => setSearch(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {recommended.length > 0 && (
          <section className="aichat-molworld-section" aria-label="为你推荐">
            <h2 className="aichat-molworld-h2">为你推荐</h2>
            <div className="aichat-mol-shelf" role="list">
              {recommended.map((m) => (
                <div key={m.id} className="aichat-mol-shelf-item" role="listitem">
                  <p className="aichat-mol-shelf-name">{m.name}</p>
                  <p className="aichat-mol-shelf-sub">{m.primaryCategory}</p>
                  {!m.owned && (
                    <button type="button" className="aichat-mol-shelf-cta" onClick={() => onBuy(m.id)} disabled={!!buyingId}>
                      ¥{m.price}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="aichat-molworld-section" aria-label="筛选">
          <h2 className="aichat-molworld-h2">筛选</h2>
          <div className="aichat-card aichat-molworld-filter-card">
            <p className="aichat-molworld-lev1">场景</p>
            <div className="aichat-mol-chips aichat-mol-chips--compact aichat-mol-chips--hscroll" role="tablist">
              {PRIMARY_SCENES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  className={scene === s ? "aichat-mol-chip aichat-mol-chip--on" : "aichat-mol-chip"}
                  onClick={() => {
                    setScene(s);
                  }}
                  aria-selected={scene === s}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="aichat-molworld-summary-line" role="status">
              <span className="aichat-molworld-summary-text">
                {scene === "全部" ? "场景：全部" : `场景：${scene}`} · 更多：{subFilterSummary}
              </span>
              {hasSubFilters && (
                <button type="button" className="aichat-molworld-summary-clear" onClick={clearSubFilters}>
                  清除子筛
                </button>
              )}
            </div>

            <details className="aichat-molworld-details">
              <summary className="aichat-molworld-details-summary">更多筛选</summary>
              <div className="aichat-molworld-advanced">
                <p className="aichat-molworld-sublab">热门任务</p>
                <div className="aichat-mol-chips aichat-mol-chips--compact">
                  {POPULAR_TASK_SHORTCUTS.map(({ label, taskTag: tag }) => (
                    <button
                      key={tag}
                      type="button"
                      className={taskTag === tag ? "aichat-mol-chip aichat-mol-chip--on" : "aichat-mol-chip"}
                      onClick={() => setTaskTag((prev) => (prev === tag ? null : tag))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="aichat-molworld-sublab">语气</p>
                <div className="aichat-mol-chips aichat-mol-chips--compact">
                  {TONE_CHIPS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={toneFilter === t ? "aichat-mol-chip aichat-mol-chip--on" : "aichat-mol-chip"}
                      onClick={() => setToneFilter((prev) => (prev === t ? null : t))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="aichat-molworld-sublab">关系</p>
                <div className="aichat-mol-chips aichat-mol-chips--compact">
                  {REL_CHIPS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={relFilter === r ? "aichat-mol-chip aichat-mol-chip--on" : "aichat-mol-chip"}
                      onClick={() => setRelFilter((prev) => (prev === r ? null : r))}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </section>

        <section className="aichat-molworld-section" aria-label="结果列表">
          <h2 className="aichat-molworld-h2">当前结果 {filteredList.length > 0 ? `· ${filteredList.length}` : ""}</h2>
          {emptySearch && (
            <div className="aichat-card aichat-mol-empty">
              <p className="aichat-mol-empty__t">没有匹配的 Mol</p>
              <p className="aichat-mol-empty__d">可尝试调整场景或换关键词</p>
              <div className="aichat-suggest-row">
                {fallbackSugs.map((c) => (
                  <button key={c} type="button" className="aichat-suggest-chip" onClick={() => setSearch(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="aichat-btn-ghost aichat-mol-empty__reset"
                onClick={() => {
                  setSearch("");
                  setScene("全部");
                  setTaskTag(null);
                  setToneFilter(null);
                  setRelFilter(null);
                }}
              >
                清空筛选
              </button>
            </div>
          )}
          <div className="aichat-page-stack">
            {filteredList.map((m) => (
              <MolCard key={m.id} m={m} buying={!!buyingId} onBuy={onBuy} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
