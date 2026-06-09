import { useCallback, useEffect, useMemo, useState } from "react";
import { POPULAR_TASK_SHORTCUTS, PRIMARY_SCENES, SEARCH_SUGGESTION_CHIPS } from "../data/molWorldTaxonomy";
import { getSearchFallbackSuggestions, searchAndRankMols } from "../lib/molWorldSearch";
import { createMyMol, getMolCatalog, purchaseMol, type MolCatalogItem } from "../services/stageApi";

const SCENE_OPTIONS = PRIMARY_SCENES.filter((s) => s !== "全部") as [string, ...string[]];

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
  const tags = [...(m.taskTags ?? []).slice(0, 3), ...(m.toneTags ?? []).slice(0, 1)].slice(0, 4);

  return (
    <article className="mol-world-a-card">
      <div className="mol-world-a-card__head">
        <h3 className="mol-world-a-card__name">{m.name}</h3>
        {m.owned ? <span className="mol-world-a-card__owned">已加入</span> : null}
      </div>
      <p className="mol-world-a-card__cat">{m.primaryCategory}</p>
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
          <span className="mol-world-a-card__price">{m.price > 0 ? `¥${m.price}` : "免费"}</span>
          <button type="button" className="mol-world-a-card__join" onClick={() => onBuy(m.id)} disabled={buying}>
            加入我的 Mol
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MolWorldTopBar({
  onBack,
  onUpload,
  onMyMols,
  uploadDisabled,
}: {
  onBack: () => void;
  onUpload: () => void;
  onMyMols?: () => void;
  uploadDisabled: boolean;
}) {
  return (
    <header className="aichat-topbar aichat-topbar-flex mol-world-a-topbar">
      <button className="mol-world-a-topbar__back" type="button" onClick={onBack}>
        返回
      </button>
      <h1 className="mol-world-a-topbar__title">Mol 世界</h1>
      <div className="aichat-molworld-top-actions">
        <button type="button" className="mol-world-a-topbar__link" disabled={uploadDisabled} onClick={onUpload}>
          上传
        </button>
        {onMyMols ? (
          <button type="button" className="mol-world-a-topbar__link" onClick={onMyMols} disabled={uploadDisabled}>
            我的
          </button>
        ) : (
          <span className="aichat-topbar-spacer" aria-hidden />
        )}
      </div>
    </header>
  );
}

export function MolWorldPage({ onBack, onMyMols }: Props) {
  const [items, setItems] = useState<MolCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState("");
  const [err, setErr] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [upName, setUpName] = useState("");
  const [upSummary, setUpSummary] = useState("");
  const [upScene, setUpScene] = useState<string>(SCENE_OPTIONS[0] ?? "职场沟通");
  const [upInfoTitle, setUpInfoTitle] = useState("");
  const [upInfoBody, setUpInfoBody] = useState("");
  const [upBusy, setUpBusy] = useState(false);
  const [upErr, setUpErr] = useState("");

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

  function openUploadModal() {
    setUpErr("");
    setUploadOpen(true);
  }

  async function submitUpload() {
    const n = upName.trim();
    const s = upSummary.trim();
    const c = upScene.trim();
    if (!n || !s || !c) {
      setUpErr("请填写名称、简介与场景。");
      return;
    }
    if ((upInfoTitle.trim() && !upInfoBody.trim()) || (!upInfoTitle.trim() && upInfoBody.trim())) {
      setUpErr("信息条目的标题与描述需同时填写，或留空。");
      return;
    }
    setUpBusy(true);
    setUpErr("");
    try {
      const initialInfo =
        upInfoTitle.trim() && upInfoBody.trim()
          ? [{ source: "custom" as const, title: upInfoTitle.trim(), body: upInfoBody.trim() }]
          : undefined;
      await createMyMol({ name: n, summary: s, primaryCategory: c, initialInfo });
      const next = await getMolCatalog();
      setItems(next);
      setUploadOpen(false);
      setUpName("");
      setUpSummary("");
      setUpScene(SCENE_OPTIONS[0] ?? "职场沟通");
      setUpInfoTitle("");
      setUpInfoBody("");
    } catch (e: unknown) {
      setUpErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUpBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="aichat-shell aichat-molworld aichat-molworld-a">
        <MolWorldTopBar onBack={onBack} onUpload={openUploadModal} onMyMols={onMyMols} uploadDisabled={upBusy} />
        <div className="aichat-main aichat-page-main aichat-molworld-main">
          <div className="mol-world-a-loading">正在加载 Mol…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aichat-shell aichat-molworld aichat-molworld-a">
      <MolWorldTopBar onBack={onBack} onUpload={openUploadModal} onMyMols={onMyMols} uploadDisabled={upBusy} />

      <div className="aichat-main aichat-page-main aichat-molworld-main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}

        <input
          className="mol-world-a-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜场景、关系或任务"
          enterKeyHint="search"
          aria-label="搜索 Mol"
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

        {recommended.length > 0 ? (
          <section className="mol-world-a-section" aria-label="为你推荐">
            <h2 className="mol-world-a-section__title">为你推荐</h2>
            <div className="mol-world-a-shelf" role="list">
              {recommended.map((m) => (
                <div key={m.id} className="mol-world-a-shelf-item" role="listitem">
                  <strong className="mol-world-a-shelf-item__name">{m.name}</strong>
                  <span className="mol-world-a-shelf-item__cat">{m.primaryCategory}</span>
                  {m.owned ? (
                    <button type="button" className="mol-world-a-shelf-item__cta mol-world-a-shelf-item__cta--owned" disabled>
                      已加入
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mol-world-a-shelf-item__cta"
                      onClick={() => onBuy(m.id)}
                      disabled={!!buyingId}
                    >
                      {m.price > 0 ? `¥${m.price}` : "加入"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="aichat-molworld-filter-card mol-world-a-filter" aria-label="筛选">
          <p className="aichat-molworld-lev1">场景</p>
          <div className="aichat-mol-chips aichat-mol-chips--compact mol-world-a-chips" role="tablist">
            {PRIMARY_SCENES.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                className={scene === s ? "aichat-mol-chip aichat-mol-chip--on" : "aichat-mol-chip"}
                onClick={() => setScene(s)}
                aria-selected={scene === s}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="aichat-molworld-summary-line mol-world-a-summary" role="status">
            <span className="aichat-molworld-summary-text">
              {scene === "全部" ? "场景：全部" : `场景：${scene}`} · 更多：{subFilterSummary}
            </span>
            {hasSubFilters ? (
              <button type="button" className="aichat-molworld-summary-clear" onClick={clearSubFilters}>
                清除子筛
              </button>
            ) : null}
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

        {emptySearch ? (
          <div className="mol-world-a-empty">
            <p className="mol-world-a-empty__t">没有匹配的 Mol</p>
            <p className="mol-world-a-empty__d">可尝试调整场景或换关键词</p>
            <div className="aichat-suggest-row">
              {fallbackSugs.map((c) => (
                <button key={c} type="button" className="aichat-suggest-chip" onClick={() => setSearch(c)}>
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="aichat-btn-ghost mol-world-a-empty__reset"
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
        ) : null}

        <div className="mol-world-a-list" aria-label="Mol 列表">
          {filteredList.map((m) => (
            <MolCard key={m.id} m={m} buying={!!buyingId} onBuy={onBuy} />
          ))}
        </div>
      </div>

      {uploadOpen ? (
        <div className="aichat-modal" role="dialog" aria-modal onClick={() => !upBusy && setUploadOpen(false)}>
          <div className="aichat-modal-box aichat-modal-box--molworld-upload" onClick={(e) => e.stopPropagation()}>
            <h2 className="aichat-modal-t">上传 Mol</h2>
            {upErr ? <p className="aichat-form-msg err">{upErr}</p> : null}
            <label className="aichat-molworld-upload-lab" htmlFor="aichat-mw-up-name">
              名称
            </label>
            <input
              id="aichat-mw-up-name"
              className="aichat-input"
              value={upName}
              onChange={(e) => setUpName(e.target.value)}
              maxLength={80}
              disabled={upBusy}
            />
            <label className="aichat-molworld-upload-lab" htmlFor="aichat-mw-up-sum">
              简介
            </label>
            <textarea
              id="aichat-mw-up-sum"
              className="aichat-textarea"
              rows={3}
              value={upSummary}
              onChange={(e) => setUpSummary(e.target.value)}
              maxLength={500}
              disabled={upBusy}
            />
            <label className="aichat-molworld-upload-lab" htmlFor="aichat-mw-up-scene">
              场景
            </label>
            <select
              id="aichat-mw-up-scene"
              className="aichat-input"
              value={upScene}
              onChange={(e) => setUpScene(e.target.value)}
              disabled={upBusy}
            >
              {SCENE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="aichat-molworld-upload-hint">可选：一条内置信息条目</p>
            <label className="aichat-molworld-upload-lab" htmlFor="aichat-mw-up-it">
              信息标题
            </label>
            <input
              id="aichat-mw-up-it"
              className="aichat-input"
              value={upInfoTitle}
              onChange={(e) => setUpInfoTitle(e.target.value)}
              maxLength={100}
              disabled={upBusy}
            />
            <label className="aichat-molworld-upload-lab" htmlFor="aichat-mw-up-ib">
              信息描述
            </label>
            <textarea
              id="aichat-mw-up-ib"
              className="aichat-textarea"
              rows={2}
              value={upInfoBody}
              onChange={(e) => setUpInfoBody(e.target.value)}
              maxLength={800}
              disabled={upBusy}
            />
            <div className="aichat-molworld-upload-actions">
              <button type="button" className="aichat-btn-ghost" disabled={upBusy} onClick={() => setUploadOpen(false)}>
                取消
              </button>
              <button type="button" className="aichat-btn-primary" disabled={upBusy} onClick={() => void submitUpload()}>
                {upBusy ? "提交中…" : "发布"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
