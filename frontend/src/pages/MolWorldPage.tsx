import { useEffect, useMemo, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../constants/suyanCopy";
import { SEARCH_SUGGESTION_CHIPS } from "../data/molWorldTaxonomy";
import { getSearchFallbackSuggestions, searchAndRankMols } from "../lib/molWorldSearch";
import { getMolCatalog, purchaseMol, type MolCatalogItem } from "../services/stageApi";

type Props = { onBack: () => void };

function MolCard({
  m,
  buying,
  onBuy,
}: {
  m: MolCatalogItem;
  buying: boolean;
  onBuy: (id: string) => void;
}) {
  const tags = [...(m.taskTags ?? []).slice(0, 3), ...(m.toneTags ?? []).slice(0, 1)].slice(0, 4);

  return (
    <article className="mol-world-a-card">
      <div className="mol-world-a-card__head">
        <h3 className="mol-world-a-card__name">{formatSuyanDisplayName(m.name)}</h3>
        {m.owned ? <span className="mol-world-a-card__owned">已加入</span> : null}
      </div>
      <p className="mol-world-a-card__hint">{m.summary}</p>
      {tags.length > 0 ? (
        <div className="mol-world-a-card__tags">
          {tags.map((t) => (
            <span key={t} className="mol-world-a-card__tag">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {!m.owned ? (
        <div className="mol-world-a-card__foot">
          <button type="button" className="mol-world-a-card__join" onClick={() => onBuy(m.id)} disabled={buying}>
            {SUYAN.joinMine}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MolWorldTopBar({ onBack }: { onBack: () => void }) {
  return (
    <header className="aichat-topbar aichat-topbar-flex mol-world-a-topbar">
      <button className="mol-world-a-topbar__back" type="button" onClick={onBack}>
        返回
      </button>
      <h1 className="mol-world-a-topbar__title">{SUYAN.world}</h1>
      <span className="aichat-topbar-spacer" aria-hidden />
    </header>
  );
}

export function MolWorldPage({ onBack }: Props) {
  const [items, setItems] = useState<MolCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState("");
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getMolCatalog()
      .then(setItems)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filteredList = useMemo(() => {
    if (search.trim()) {
      return searchAndRankMols(items, search);
    }
    return [...items].sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
  }, [items, search]);

  const emptySearch = !loading && filteredList.length === 0 && search.trim().length > 0;
  const emptyCatalog = !loading && items.length === 0 && !search.trim();
  const fallbackSugs = useMemo(
    () => getSearchFallbackSuggestions(items, search, SEARCH_SUGGESTION_CHIPS),
    [items, search],
  );

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
      <div className="aichat-shell aichat-molworld aichat-molworld-a">
        <MolWorldTopBar onBack={onBack} />
        <div className="aichat-main aichat-page-main aichat-molworld-main">
          <div className="mol-world-a-loading">正在加载{SUYAN.name}…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aichat-shell aichat-molworld aichat-molworld-a">
      <MolWorldTopBar onBack={onBack} />

      <div className="aichat-main aichat-page-main aichat-molworld-main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}

        <input
          className="mol-world-a-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`搜索${SUYAN.name}`}
          enterKeyHint="search"
          aria-label={`搜索${SUYAN.name}`}
        />
        {search.trim() ? (
          <div className="aichat-suggest-row" role="list">
            {SEARCH_SUGGESTION_CHIPS.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
              .slice(0, 4)
              .map((c) => (
                <button key={c} type="button" className="aichat-suggest-chip" onClick={() => setSearch(c)}>
                  {c}
                </button>
              ))}
          </div>
        ) : null}

        {emptyCatalog ? (
          <div className="mol-world-a-empty">
            <p className="mol-world-a-empty__t">暂无{SUYAN.name}</p>
            <p className="mol-world-a-empty__d">请返回后重新进入，或稍后再试</p>
          </div>
        ) : null}

        {emptySearch ? (
          <div className="mol-world-a-empty">
            <p className="mol-world-a-empty__t">没有匹配的{SUYAN.name}</p>
            <p className="mol-world-a-empty__d">可换关键词再试</p>
            <div className="aichat-suggest-row">
              {fallbackSugs.map((c) => (
                <button key={c} type="button" className="aichat-suggest-chip" onClick={() => setSearch(c)}>
                  {c}
                </button>
              ))}
            </div>
            <button type="button" className="aichat-btn-ghost mol-world-a-empty__reset" onClick={() => setSearch("")}>
              清空搜索
            </button>
          </div>
        ) : null}

        <div className="mol-world-a-list" aria-label={`${SUYAN.name}列表`}>
          {filteredList.map((m) => (
            <MolCard key={m.id} m={m} buying={!!buyingId} onBuy={onBuy} />
          ))}
        </div>
      </div>
    </div>
  );
}
