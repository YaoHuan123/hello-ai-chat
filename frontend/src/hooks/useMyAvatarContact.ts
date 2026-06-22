import { useEffect, useState } from "react";
import { getMyAvatarContact, ME_PROFILE_UPDATED_EVENT } from "../services/storage";

export function useMyAvatarContact() {
  const [contact, setContact] = useState(getMyAvatarContact);

  useEffect(() => {
    const sync = () => setContact(getMyAvatarContact());
    window.addEventListener(ME_PROFILE_UPDATED_EVENT, sync);
    return () => window.removeEventListener(ME_PROFILE_UPDATED_EVENT, sync);
  }, []);

  return contact;
}
