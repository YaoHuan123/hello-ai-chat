import {
  RELATION_MOL_CATEGORY,
  groupOrderIndex,
  relationGroupLabel,
  relationLabel,
  type RelationFilterId,
  type RelationType,
  contactMatchesFilter,
} from "../constants/relationTypes";
import { contactDisplayName } from "./contactDisplay";
import type { ContactItem } from "../types/contact";

export type ContactGroup = {
  label: string;
  contacts: ContactItem[];
};

export function filterContacts(
  contacts: ContactItem[],
  query: string,
  filter: RelationFilterId,
): ContactItem[] {
  const q = query.trim().toLowerCase();
  return contacts.filter((c) => {
    if (!contactMatchesFilter(c.relationType, filter)) return false;
    if (!q) return true;
    const name = contactDisplayName(c).toLowerCase();
    const phone = c.phone.toLowerCase();
    const rel = relationLabel(c.relationType)?.toLowerCase() ?? "";
    const group = relationGroupLabel(c.relationType).toLowerCase();
    return name.includes(q) || phone.includes(q) || rel.includes(q) || group.includes(q);
  });
}

export function groupContactsByRelation(contacts: ContactItem[]): ContactGroup[] {
  const map = new Map<string, ContactItem[]>();
  for (const c of contacts) {
    const label = relationGroupLabel(c.relationType);
    const list = map.get(label) ?? [];
    list.push(c);
    map.set(label, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => groupOrderIndex(a) - groupOrderIndex(b))
    .map(([label, items]) => ({ label, contacts: items }));
}

export function pickRecommendedMolId(
  mols: { id: string; primaryCategory: string }[],
  relationType: RelationType | null | undefined,
  defaultMolId: string | null | undefined,
): string | null {
  if (defaultMolId && mols.some((m) => m.id === defaultMolId)) return defaultMolId;
  if (!relationType) return mols[0]?.id ?? null;
  const targetCat = RELATION_MOL_CATEGORY[relationType];
  if (targetCat) {
    const match = mols.find((m) => m.primaryCategory === targetCat);
    if (match) return match.id;
  }
  return mols[0]?.id ?? null;
}
