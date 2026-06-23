import { YIYI } from "../../constants/productCopy";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { loadYiyiState, saveYiyiTrash } from "../../services/yiyiClient";
import type { YiyiTrashItem } from "../../types/yiyi";

type Props = {
  onBack: () => void;
};

export function YiyiTrashPage({ onBack }: Props) {
  const [items, setItems] = useState<YiyiTrashItem[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setErr("");
    void loadYiyiState()
      .then((s) => setItems(s.trash))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function persist(next: YiyiTrashItem[]) {
    setSaving(true);
    setErr("");
    try {
      const saved = await saveYiyiTrash(next);
      setItems(saved);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onToggle(id: string, enabled: boolean) {
    const next = items.map((x) => (x.id === id ? { ...x, enabled } : x));
    setItems(next);
    void persist(next);
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (items.some((x) => x.label === trimmed)) return;
    if (items.filter((x) => x.isCustom).length >= 20) return;
    const next: YiyiTrashItem[] = [
      ...items,
      { id: `trash-${Date.now()}`, label: trimmed, enabled: true, isCustom: true },
    ];
    setDraft("");
    setItems(next);
    void persist(next);
  }

  const presets = items.filter((x) => !x.isCustom);
  const customs = items.filter((x) => x.isCustom);

  return (
    <div className="aichat-shell yiyi-subpage">
      <header className="aichat-topbar aichat-topbar-flex yiyi-subpage__topbar">
        <button type="button" className="aichat-btn-ghost" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>{YIYI.trash}</h1>
        </div>
        <span className="yiyi-tab__topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main yiyi-subpage__main">
        {err ? <p className="aichat-form-msg err">{err}</p> : null}
        {loading ? <p className="yiyi-empty">加载中…</p> : null}

        <p className="yiyi-intro">
          {YIYI.trashDesc}
        </p>

        <section className="yiyi-check-group" aria-label="系统推荐">
          <h2 className="yiyi-check-group__head">系统推荐</h2>
          {presets.map((item) => (
            <label key={item.id} className="yiyi-check-row">
              <input
                type="checkbox"
                checked={item.enabled}
                disabled={saving}
                onChange={(e) => onToggle(item.id, e.target.checked)}
              />
              <span className="yiyi-check-row__body">
                <span className="yiyi-check-row__label">{item.label}</span>
                {item.hint ? <span className="yiyi-check-row__hint">{item.hint}</span> : null}
              </span>
            </label>
          ))}
        </section>

        {customs.length > 0 ? (
          <section className="yiyi-check-group" aria-label="自定义">
            <h2 className="yiyi-check-group__head">自定义</h2>
            {customs.map((item) => (
              <label key={item.id} className="yiyi-check-row">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  disabled={saving}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                />
                <span className="yiyi-check-row__body">
                  <span className="yiyi-check-row__label">{item.label}</span>
                </span>
              </label>
            ))}
          </section>
        ) : null}

        <form className="yiyi-add-row" onSubmit={onAdd}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="添加排斥的沟通方式…"
            maxLength={80}
            disabled={saving}
          />
          <button type="submit" disabled={!draft.trim() || saving}>
            添加
          </button>
        </form>
      </div>
    </div>
  );
}
