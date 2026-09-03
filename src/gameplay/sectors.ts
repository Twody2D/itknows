const LEVEL_ID_RE = /^sector-(\d+)-level-(\d+)$/;

/** Levels per sector — matches every `SECTOR_0X_LEVELS` array (`src/data/levels/`). */
export const LEVELS_PER_SECTOR = 6;

export function sectorNumberOf(levelId: string): number {
  const match = LEVEL_ID_RE.exec(levelId);
  return match ? Number(match[1]) : 1;
}

/** True for the last level of a sector (`...-level-06`) — the Sector Complete breakpoint. */
export function isSectorFinale(levelId: string): boolean {
  const match = LEVEL_ID_RE.exec(levelId);
  return match ? Number(match[2]) === LEVELS_PER_SECTOR : false;
}
