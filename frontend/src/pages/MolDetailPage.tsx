import { useCallback, useEffect, useState } from "react";
import { PRIMARY_SCENES } from "../data/molWorldTaxonomy";
import {
  createMyMolPrivate,
  getMyMolDetailForEdit,
  updateMyMol,
  type MolInMyCollection,
  type MolInfoItem,
} from "../services/stageApi";

const SCENE_OPTIONS = PRIMARY_SCENES.filter((s) => s !== "全部") as [string, ...string[]];

type Props = {
  molId: "new" | string;
  onBack: () => void;
};

function newLocalInfoId() {
  return `inf-l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function infoTagLabel(item: MolInfoItem): string {
  if (item.source === "store") {
    return item.softRemoved ? "模板（已移除）" : "模板";
  }
  return "自定义";
}

type InfoFormMode = { kind: "add" } | { kind: "edit"; id: string } | null;

function InfoItemEditor({
  mode,
  defaultTitle,
  defaultBody,
  onSave,
  onClose,
  saving,
}: {
  mode: NonNullable<InfoFormMode>;
  defaultTitle: string;
  defaultBody: string;
  onSave: (title: string, body: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const t = mode.kind === "add" ? "添加信息" : "编辑信息";

  return (
    <div
      className="aichat-moldt-info-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="aichat-moldt-info-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4 className="aichat-moldt-info-form__h">{t}</h4>
        <label className="aichat-moldt-info-form__lab" htmlFor="aichat-info-title">
          标题
        </label>
        <input id="aichat-info-title" className="aichat-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        <label className="aichat-moldt-info-form__lab" htmlFor="aichat-info-body">
          描述
        </label>
        <textarea id="aichat-info-body" className="aichat-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={800} />
        <div className="aichat-moldt-info-form__act">
          <button type="button" className="aichat-btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button type="button" className="aichat-btn-primary aichat-btn-fit" onClick={() => onSave(title.trim(), body.trim())} disabled={saving}>
            {saving ? "请稍候…" : "确定"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MolDetailPage({ molId, onBack }: Props) {
  const isNew = molId === "new";
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<string>(SCENE_OPTIONS[0] ?? "职场沟通");
  const [source, setSource] = useState<MolInMyCollection["source"] | null>(isNew ? "created" : null);

  const [infoItems, setInfoItems] = useState<MolInfoItem[]>([]);
  const [infoForm, setInfoForm] = useState<InfoFormMode>(null);
  const [infoFormKey, setInfoFormKey] = useState(0);
  const [readOnly, setReadOnly] = useState(false);

  const load = useCallback(() => {
    if (isNew) {
      setName("");
      setSummary("");
      setCategory(SCENE_OPTIONS[0] ?? "职场沟通");
      setSource("created");
      setInfoItems([]);
      setReadOnly(false);
      setLoading(false);
      return;
    }
    setLoadErr("");
    setLoading(true);
    getMyMolDetailForEdit(molId)
      .then(({ item, info }) => {
        setName(item.name);
        setSummary(item.summary);
        setCategory(item.primaryCategory);
        setSource(item.source);
        setInfoItems(info.map((x) => ({ ...x })));
        setReadOnly(item.uploaderIsMe === false);
      })
      .catch((e: unknown) => {
        setLoadErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, [isNew, molId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function softDeleteStore(id: string) {
    setInfoItems((list) => list.map((i) => (i.id === id && i.source === "store" ? { ...i, softRemoved: true } : i)));
  }

  function restoreStore(id: string) {
    setInfoItems((list) => list.map((i) => (i.id === id && i.source === "store" ? { ...i, softRemoved: false } : i)));
  }

  function hardDeleteCustom(id: string) {
    setInfoItems((list) => list.filter((i) => i.id !== id));
  }

  async function saveAll() {
    const n = name.trim();
    const s = summary.trim();
    const c = category.trim();
    if (!n || !s || !c) {
      setSaveErr("请填写名称、简介与场景。");
      return;
    }
    if (readOnly) {
      return;
    }
    setSaveErr("");
    setSaving(true);
    try {
      if (isNew) {
        await createMyMolPrivate({
          name: n,
          summary: s,
          primaryCategory: c,
          initialInfo: infoItems.map(({ source: src, title, body, softRemoved }) => ({
            source: src,
            title,
            body,
            softRemoved,
          })),
        });
        onBack();
        return;
      }
      await updateMyMol(molId, { name: n, summary: s, primaryCategory: c, infoItems });
      onBack();
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="aichat-moldt aichat-moldt--load">
        <p className="aichat-card" style={{ margin: 16 }}>
          正在加载…
        </p>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="aichat-moldt aichat-moldt--load">
        <p className="aichat-form-msg err" style={{ margin: 16 }}>
          {loadErr}
        </p>
        <button type="button" className="aichat-btn-primary" onClick={onBack} style={{ margin: 16 }}>
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="aichat-moldt">
      <header className="aichat-moldt-navbar" role="banner">
        <button type="button" className="aichat-moldt-back" onClick={onBack} disabled={saving} aria-label="返回">
          ←
        </button>
        <div className="aichat-moldt-navbar-title">Mol 信息管理</div>
        {!readOnly && (
          <button type="button" className="aichat-moldt-save" onClick={saveAll} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        )}
        {readOnly && <div className="aichat-moldt-save" aria-hidden style={{ width: 44 }} />}
      </header>

      {saveErr && <p className="aichat-moldt-banner-err aichat-form-msg err">{saveErr}</p>}

      <div className="aichat-moldt-body">
        {readOnly && <p className="aichat-moldt-banner-ro">仅上传者可编辑名称、场景、简介与信息条目。</p>}
        <section className="aichat-moldt-molhead" aria-label="Mol 概览">
          <div className="aichat-moldt-avatar" aria-hidden>
            {name.trim() ? <span className="aichat-moldt-avatar__txt">{name.trim().slice(0, 1)}</span> : <span className="aichat-moldt-avatar__txt">Mol</span>}
          </div>
          <div className="aichat-moldt-molhead__main">
            <input
              className="aichat-moldt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="职业形象或 Mol 名称"
              aria-label="名称"
              readOnly={readOnly}
              disabled={readOnly}
            />
            <p className="aichat-moldt-name-hint">
              {readOnly
                ? "来自 Mol 世界 · 只读"
                : source === "store"
                  ? "来自 Mol 世界 · 可编辑本页内容"
                  : "自己创建 · 可编辑本页内容"}
            </p>
            <div className="aichat-moldt-scenewrap">
              <label className="aichat-moldt-hid" htmlFor="aichat-mol-detail-scene">
                场景
              </label>
              <select
                id="aichat-mol-detail-scene"
                className="aichat-moldt-scene"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={readOnly}
              >
                {SCENE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label className="aichat-moldt-sumlab" htmlFor="aichat-mol-detail-sum">
              简介
            </label>
            <textarea
              id="aichat-mol-detail-sum"
              className="aichat-moldt-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="用一两句话概括用途与风格"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
        </section>

        <div className="aichat-moldt-infohead">
          <h2 className="aichat-moldt-infohead__t">信息集合列表</h2>
          <button
            type="button"
            className="aichat-moldt-addinfo"
            onClick={() => {
              setInfoFormKey((k) => k + 1);
              setInfoForm({ kind: "add" });
            }}
            disabled={saving || readOnly}
          >
            + 添加信息
          </button>
        </div>

        <ul className="aichat-moldt-infolist" role="list">
          {infoItems.length === 0 && (
            <li className="aichat-moldt-infolist__empty">
              {readOnly ? "暂无信息条目。" : "还没有信息。可点击「+ 添加信息」添加自定义条目。"}
            </li>
          )}
          {infoItems.map((it) => {
            const isSoft = it.softRemoved && it.source === "store";
            const isStore = it.source === "store";
            return (
              <li
                key={it.id}
                className={[
                  "aichat-moldt-item",
                  isStore && !isSoft && "aichat-moldt-item--store",
                  it.source === "custom" && "aichat-moldt-item--own",
                  isSoft && "aichat-moldt-item--off",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="listitem"
              >
                <div className="aichat-moldt-item__content">
                  <div className="aichat-moldt-item__title">{it.title}</div>
                  <div className="aichat-moldt-item__desc">{it.body}</div>
                  <span className="aichat-moldt-item__tag">{infoTagLabel(it)}</span>
                </div>
                <div className="aichat-moldt-item__actions" role="group" aria-label="行操作">
                  {isStore && isSoft ? (
                    <button
                      type="button"
                      className="aichat-moldt-iconbtn aichat-moldt-iconbtn--rest"
                      aria-label="恢复此条模板信息"
                      title="恢复"
                      onClick={() => restoreStore(it.id)}
                      disabled={saving || readOnly}
                    >
                      ↩
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="aichat-moldt-iconbtn aichat-moldt-iconbtn--ed"
                      aria-label="编辑"
                      onClick={() => {
                        setInfoFormKey((k) => k + 1);
                        setInfoForm({ kind: "edit", id: it.id });
                      }}
                      disabled={saving || readOnly}
                    >
                      ✏
                    </button>
                  )}
                  {it.source === "store" && !it.softRemoved ? (
                    <button
                      type="button"
                      className="aichat-moldt-iconbtn aichat-moldt-iconbtn--dl"
                      aria-label="软删除（可恢复）"
                      onClick={() => {
                        if (window.confirm("将此项标记为已移除？模板条目可随后恢复。")) {
                          softDeleteStore(it.id);
                        }
                      }}
                      disabled={saving || readOnly}
                    >
                      ✂
                    </button>
                  ) : null}
                  {it.source === "custom" ? (
                    <button
                      type="button"
                      className="aichat-moldt-iconbtn aichat-moldt-iconbtn--dl"
                      aria-label="删除此自定义项"
                      onClick={() => {
                        if (window.confirm("确定删除该自定义条？删除后无法恢复。")) {
                          hardDeleteCustom(it.id);
                        }
                      }}
                      disabled={saving || readOnly}
                    >
                      ✂
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {infoForm?.kind === "add" && (
        <InfoItemEditor
          key={`a-${infoFormKey}`}
          mode={infoForm}
          defaultTitle=""
          defaultBody=""
          saving={saving}
          onClose={() => setInfoForm(null)}
          onSave={(t, b) => {
            if (!t || !b) {
              setSaveErr("请填写信息标题与描述。");
              return;
            }
            setSaveErr("");
            setInfoItems((list) => list.concat([{ id: newLocalInfoId(), source: "custom", title: t, body: b }]));
            setInfoForm(null);
          }}
        />
      )}

      {infoForm?.kind === "edit" && (
        <InfoItemEditor
          key={`e-${infoForm.id}-${infoFormKey}`}
          mode={infoForm}
          defaultTitle={infoItems.find((i) => i.id === infoForm.id)?.title ?? ""}
          defaultBody={infoItems.find((i) => i.id === infoForm.id)?.body ?? ""}
          saving={saving}
          onClose={() => setInfoForm(null)}
          onSave={(t, b) => {
            if (!t || !b) {
              setSaveErr("请填写信息标题与描述。");
              return;
            }
            setSaveErr("");
            setInfoItems((list) => list.map((i) => (i.id === infoForm.id ? { ...i, title: t, body: b } : i)));
            setInfoForm(null);
          }}
        />
      )}
    </div>
  );
}
