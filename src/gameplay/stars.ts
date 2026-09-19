import { LEVELS_PER_SECTOR, SECTOR_COUNT, isLevelUnlocked, sectorNumberOf } from './sectors';

/**
 * Stars are the campaign's reason to play a level twice.
 *
 * Every number the game already had said only "done or not done": the level
 * was cleared, the best time was printed, and neither asked anything further
 * of the player. Three stars turn each level into three questions — get
 * through it, get through it without dying, and do that inside the level's
 * own target time (`parTime.ts`).
 *
 * The rules live here, apart from storage and from drawing, so they can be
 * asserted directly. Nothing in this file reads a save or touches a scene.
 */

export const MAX_STARS = 3;

/** CREDITS paid once for each star the first time it is earned (`shop/EconomyRewards.ts`). */
export const STAR_CREDITS = 15;

export interface RunOutcome {
  /** Time for this visit to the level, in ms — `GameState.elapsedMs()`. */
  timeMs: number;
  /** Deaths on this visit — `GameState.run.deaths`. */
  deaths: number;
  /** The level's target time, or `null` for a level with no derivable one. */
  parMs: number | null;
}

/**
 * Stars earned by ONE visit to a level.
 *
 * One visit, not a career: a 20-second clear with four deaths and a later
 * 8-second clear with one must not add up to three stars between them. That
 * is also why the time is only ever read for a deathless run — after a death
 * `timeMs` covers every failed attempt too (`GameState.elapsedMs()` survives
 * the restart on purpose), so comparing it to a target would be comparing
 * two different things.
 */
export function starsFor({ timeMs, deaths, parMs }: RunOutcome): number {
  if (deaths > 0) return 1;
  if (parMs === null || timeMs > parMs) return 2;
  return 3;
}

/**
 * The first sector that asks for stars rather than only for the sector
 * before it. The original five never do: a campaign that walled a player who
 * had already finished it would be punishing them for having been early.
 */
export const FIRST_GATED_SECTOR = 6;

/** Share of the stars available so far that a gated sector asks for. */
const GATE_FRACTION = 0.5;

/** Every star obtainable in sectors 1..`sectorNumber`, inclusive. */
export function starsAvailableThrough(sectorNumber: number): number {
  return Math.max(0, sectorNumber) * LEVELS_PER_SECTOR * MAX_STARS;
}

/**
 * Stars needed to open `sectorNumber`, on top of clearing the sector before
 * it. Zero for the original campaign.
 *
 * Half of what the player could have collected by then, so it is met by
 * two-starring most of the way rather than by three-starring anything —
 * `tests/stars.test.ts` holds that ratio well clear of the ceiling, because
 * a gate nobody can pass is not difficulty, it is a wall.
 */
export function starGateFor(sectorNumber: number): number {
  if (sectorNumber < FIRST_GATED_SECTOR) return 0;
  return Math.round(starsAvailableThrough(sectorNumber - 1) * GATE_FRACTION);
}

/**
 * Whether a sector's star gate is satisfied.
 *
 * A SEPARATE QUESTION from `isLevelUnlocked`, deliberately: that one asks
 * "did you finish the level before this one", this one asks "have you earned
 * enough across the campaign". One predicate answering both would hand back
 * a single boolean for two different reasons, and the level map has to tell
 * the player which of the two is stopping them.
 *
 * It lives here rather than in `sectors.ts` because the gate is a stars rule
 * and `sectors.ts` knows nothing about stars — the dependency runs one way,
 * so neither module can end up importing the other back.
 */
export function isSectorUnlocked(sectorNumber: number, totalStars: number): boolean {
  return totalStars >= starGateFor(sectorNumber);
}

/** Both conditions at once — the level map's real "can this be played" test. */
export function canPlayLevel(levelId: string, isCompleted: (id: string) => boolean, totalStars: number): boolean {
  return isLevelUnlocked(levelId, isCompleted) && isSectorUnlocked(sectorNumberOf(levelId), totalStars);
}

/**
 * Stars that unlock the `reference` skin (`data/shop/items.ts`) — half of
 * every star the campaign holds, derived rather than typed in so it follows
 * the campaign when sectors are added.
 *
 * The same share the sector gates ask for, and the same reasoning: it is met
 * by two-starring the way through, not by three-starring anything. It is the
 * one item in the shop that money cannot reach, which is the point — stars
 * pay CREDITS, so without something that only stars buy, the extra income
 * would just chase a catalogue that was already affordable.
 */
export const COLLECTOR_SKIN_STARS = Math.round(starsAvailableThrough(SECTOR_COUNT) * GATE_FRACTION);

/**
 * The other two thresholds on the same ladder: `echo` at a third of the
 * campaign's stars, `reference` at a half, `beep7` at two thirds — 60, 90
 * and 120 out of 180 at ten sectors, all derived so they follow the
 * campaign instead of going stale in it.
 *
 * WHY THESE TWO STOPPED HAVING A PRICE (owner's decision 2026-09-19). The
 * shop was measured against the finished campaign and found over-funded:
 * the whole purchasable catalogue cost 1460 CREDITS while even a player who
 * died on every single level earned 1750 in one pass, and a good one earned
 * 4150 (`docs/SHOP.md`). Raising prices would not fix that — it would just
 * move the same number. What fixes it is the thing stars were added for: an
 * item money cannot reach. The two most expensive cosmetics in the game are
 * now the two that cannot be bought at all, which is also the only way their
 * `premium` rarity means anything.
 *
 * Nobody loses a purchase: `InventoryService` ownership is permanent, so a
 * player who already bought either one keeps it.
 */
export const ECHO_SKIN_STARS = Math.round(starsAvailableThrough(SECTOR_COUNT) / 3);
export const BEEP7_TRAIL_STARS = Math.round((starsAvailableThrough(SECTOR_COUNT) * 2) / 3);
