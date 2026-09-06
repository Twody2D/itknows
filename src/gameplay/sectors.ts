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

/** How many sectors the campaign has (matches `SECTOR_0X_LEVELS` arrays and `art/Environment.ts`'s themes). */
export const SECTOR_COUNT = 5;

// SYSTEM-branded sector callsigns — deliberately not translated (CLAUDE.md
// #7 treats these like `SYSTEM ONLINE`/`v1.4`: technical tokens, not copy),
// and shared with `art/Environment.ts`'s per-sector theme comments so the
// name on the level-select screen matches the world you actually see.
const SECTOR_NAMES: Record<number, string> = {
  1: 'SYSTEM BOOT',
  2: 'NEON GRID',
  3: 'INDUSTRIAL CORE',
  4: 'DATA DISTRICT',
  5: 'SYSTEM CORE',
};

export function sectorName(sectorNumber: number): string {
  return SECTOR_NAMES[sectorNumber] ?? `SECTOR ${sectorNumber}`;
}

export function levelIdFor(sectorNumber: number, levelNumber: number): string {
  const sector = String(sectorNumber).padStart(2, '0');
  const level = String(levelNumber).padStart(2, '0');
  return `sector-${sector}-level-${level}`;
}

/** `sector-01`-style id for a level — the key `SaveService`'s sector-best-time store and `LeaderboardService`'s sector tables use, so both stay consistent with `GameState.currentSectorId`'s own format. */
export function sectorIdOf(levelId: string): string {
  return `sector-${String(sectorNumberOf(levelId)).padStart(2, '0')}`;
}
