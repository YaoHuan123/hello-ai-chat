export interface ContactItem {
  contactUserId: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
  remark: string | null;
  createdAt: number;
}
