import { useState } from "react";
import { getGuardianAvatarUrl } from "../assets/guardianAvatars";
import type { GuardianRole } from "../types/guardian";

type GuardianAvatarFields = Pick<GuardianRole, "id" | "name" | "avatarColor"> & {
  avatarUrl?: string;
};

export function resolveGuardianAvatarSrc(role: GuardianAvatarFields): string | undefined {
  const custom = role.avatarUrl?.trim();
  if (custom) return custom;
  return getGuardianAvatarUrl(role.id);
}

type Props = {
  role: GuardianAvatarFields;
  className?: string;
  imgClassName?: string;
  alt?: string;
};

export function GuardianAvatar({ role, className, imgClassName = "guardian-avatar__img", alt }: Props) {
  const src = resolveGuardianAvatarSrc(role);
  const [imgFailed, setImgFailed] = useState(false);
  const label = alt ?? role.name;
  const showImg = Boolean(src) && !imgFailed;

  if (showImg) {
    return (
      <span className={className}>
        <img
          className={imgClassName}
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={className} style={{ background: role.avatarColor }} aria-hidden={alt === ""}>
      <span className="guardian-avatar__letter">{role.name.slice(0, 1)}</span>
    </span>
  );
}
