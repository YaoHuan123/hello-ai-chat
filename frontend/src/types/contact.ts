import type { RelationType } from "../constants/relationTypes";

export interface ContactItem {
  contactUserId: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
  remark: string | null;
  relationType: RelationType | null;
  defaultMolId: string | null;
  createdAt: number;
}

export type ContactPatch = {
  remark?: string | null;
  relationType?: RelationType | null;
  defaultMolId?: string | null;
};
