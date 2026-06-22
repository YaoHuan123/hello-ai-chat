export const USER_GENDERS = ["male", "female", "private"] as const;

export type UserGender = (typeof USER_GENDERS)[number];

export function isValidUserGender(v: string): v is UserGender {
  return (USER_GENDERS as readonly string[]).includes(v);
}

export function normalizeUserGender(raw: string | null | undefined): UserGender | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return isValidUserGender(t) ? t : null;
}
