import type { ContactItem } from "../types/contact";
import { contactAvatarLetter, contactDisplayName } from "../lib/contactDisplay";
import { resolveAvatarSrc } from "../lib/avatarUrl";

export type ContactAvatarFields = Pick<
  ContactItem,
  "phone" | "remark" | "nickname" | "avatarUrl" | "avatarUpdatedAt"
>;

type Props = {
  contact: ContactAvatarFields;
  className?: string;
  imgClassName?: string;
  alt?: string;
};

export function ContactAvatar({ contact, className, imgClassName = "contact-avatar__img", alt }: Props) {
  const src = resolveAvatarSrc(contact.avatarUrl, contact.avatarUpdatedAt);
  const label = alt ?? contactDisplayName(contact);

  if (src) {
    return (
      <span className={className}>
        <img className={imgClassName} src={src} alt={label} />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden={alt === ""}>
      {contactAvatarLetter(contact)}
    </span>
  );
}
