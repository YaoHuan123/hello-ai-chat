export const USER_GENDERS = ["male", "female", "private"] as const;

export type UserGender = (typeof USER_GENDERS)[number];

export const USER_GENDER_LABEL: Record<UserGender, string> = {
  male: "男",
  female: "女",
  private: "不透露",
};

export function isUserGender(v: string): v is UserGender {
  return (USER_GENDERS as readonly string[]).includes(v);
}

export function genderDisplayLabel(gender: UserGender | null | undefined): string {
  if (!gender) return "未设置";
  return USER_GENDER_LABEL[gender];
}
