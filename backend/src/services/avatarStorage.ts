import fs from "fs";
import path from "path";
import { AVATARS_DIR } from "../config";

const AVATAR_EXTS = ["jpg", "png", "webp"] as const;
export type AvatarExt = (typeof AVATAR_EXTS)[number];

export function detectAvatarExt(buffer: Buffer): AvatarExt | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function avatarPublicPath(userId: string, ext: AvatarExt): string {
  return `/uploads/avatars/${userId}.${ext}`;
}

export function saveUserAvatar(userId: string, buffer: Buffer, ext: AvatarExt): string {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
  for (const other of AVATAR_EXTS) {
    if (other === ext) continue;
    try {
      fs.unlinkSync(path.join(AVATARS_DIR, `${userId}.${other}`));
    } catch {
      /* ignore missing file */
    }
  }
  fs.writeFileSync(path.join(AVATARS_DIR, `${userId}.${ext}`), buffer);
  return avatarPublicPath(userId, ext);
}

export function deleteUserAvatarFiles(userId: string): void {
  for (const ext of AVATAR_EXTS) {
    try {
      fs.unlinkSync(path.join(AVATARS_DIR, `${userId}.${ext}`));
    } catch {
      /* ignore missing file */
    }
  }
}
