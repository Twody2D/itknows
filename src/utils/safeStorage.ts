/**
 * `localStorage` access that never throws and never crashes the game when
 * storage is missing, blocked (privacy mode) or full (CLAUDE.md #8 — guest
 * progress/settings must degrade to "doesn't persist" instead of an error).
 * Shared by every module with its own persisted slice (`SaveService`,
 * `AudioSettings`) so the failure-handling contract can't drift between them.
 */
export function readJson(key: string): unknown {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked/full storage never breaks the game — callers keep an in-memory
    // copy that stays correct for the rest of this session either way.
  }
}
