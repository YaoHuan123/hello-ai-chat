import type { RelationType } from "../constants/relationTypes";
import type { UserGender } from "../constants/userGender";

export interface ContactItem {
  contactUserId: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
  gender: UserGender | null;
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
