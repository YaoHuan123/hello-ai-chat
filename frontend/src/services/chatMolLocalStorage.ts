const KEY_PREFIX = "aichat.chatMol.";

function keyForPeer(peerUserId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(peerUserId)}`;
}

export function getChatActiveMolId(peerUserId: string): string | null {
  try {
    const raw = localStorage.getItem(keyForPeer(peerUserId));
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function setChatActiveMolId(peerUserId: string, molId: string): void {
  try {
    localStorage.setItem(keyForPeer(peerUserId), molId);
  } catch {
    /* ignore */
  }
}
