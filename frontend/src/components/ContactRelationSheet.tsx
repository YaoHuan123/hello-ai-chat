import { useEffect, useState } from "react";
import { SUYAN, formatSuyanDisplayName } from "../constants/suyanCopy";
import {
  RELATION_PICKER_TYPES,
  relationLabel,
  type RelationType,
} from "../constants/relationTypes";
import { patchContactApi } from "../services/api";
import { getMyMols, type MolInMyCollection } from "../services/stageApi";
import { contactDisplayName } from "../lib/contactDisplay";
import { pickRecommendedMolId } from "../lib/contactRelations";
import type { ContactItem } from "../types/contact";
import { ContactAvatar } from "./ContactAvatar";

type Props = {
  contact: ContactItem;
  open: boolean;
  onClose: () => void;
  onSaved: (contact: ContactItem) => void;
};

export function ContactRelationSheet({ contact, open, onClose, onSaved }: Props) {
  const [relationType, setRelationType] = useState<RelationType | null>(contact.relationType);
  const [defaultMolId, setDefaultMolId] = useState<string | null>(contact.defaultMolId);
  const [mols, setMols] = useState<MolInMyCollection[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setRelationType(contact.relationType);
    setDefaultMolId(contact.defaultMolId);
    setErr("");
    void getMyMols()
      .then(setMols)
      .catch(() => setMols([]));
  }, [open, contact]);

  useEffect(() => {
    if (!open || defaultMolId) return;
    const rec = pickRecommendedMolId(mols, relationType, null);
    if (rec) setDefaultMolId(rec);
  }, [open, mols, relationType, defaultMolId]);

  if (!open) return null;

  async function onSave() {
    if (!relationType) {
      setErr("请选择关系类型");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const { contact: next } = await patchContactApi(contact.contactUserId, {
        relationType,
        defaultMolId: defaultMolId || null,
      });
      onSaved(next);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const displayName = contactDisplayName(contact);

  return (
    <div className="contacts-sheet-overlay" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="contacts-sheet contact-relation-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-relation-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="contacts-sheet__handle" aria-hidden />
        <div className="contact-relation-sheet__head">
          <ContactAvatar contact={contact} className="contact-relation-sheet__av" alt="" />
          <div>
            <h2 id="contact-relation-title" className="contacts-sheet__title">
              设置关系
            </h2>
            <p className="contact-relation-sheet__sub">{displayName}</p>
          </div>
        </div>
        <p className="contact-relation-sheet__hint">关系会影响回复推荐的语气与边界。</p>

        <span className="contact-relation-sheet__label">关系类型</span>
        <div className="rel-grid" role="listbox" aria-label="关系类型">
          {RELATION_PICKER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={relationType === t}
              className={`rel-opt ${relationType === t ? "selected" : ""}`}
              onClick={() => setRelationType(t)}
              disabled={saving}
            >
              {relationLabel(t)}
            </button>
          ))}
        </div>

        {mols.length > 0 ? (
          <>
            <label className="contact-relation-sheet__label" htmlFor="contact-default-mol">
              默认{SUYAN.name}
            </label>
            <select
              id="contact-default-mol"
              className="contact-relation-sheet__select"
              value={defaultMolId ?? ""}
              onChange={(e) => setDefaultMolId(e.target.value.trim() || null)}
              disabled={saving}
            >
              <option value="">不绑定</option>
              {mols.map((m) => {
                const rec = pickRecommendedMolId(mols, relationType, defaultMolId);
                const suffix = rec === m.id ? " · 推荐" : "";
                return (
                  <option key={m.id} value={m.id}>
                    {formatSuyanDisplayName(m.name)}
                    {suffix}
                  </option>
                );
              })}
            </select>
          </>
        ) : null}

        {err ? <p className="aichat-form-msg err">{err}</p> : null}

        <div className="contacts-sheet__actions">
          <button className="aichat-btn-ghost contacts-sheet__btn" type="button" disabled={saving} onClick={onClose}>
            取消
          </button>
          <button className="aichat-btn-primary contacts-sheet__btn" type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
