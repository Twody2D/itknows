import { PHYSICS } from '@/config/physics';

/** Maximum height (px) a full-held jump gains above the takeoff point. */
export const MAX_JUMP_RISE_PX = (PHYSICS.jumpVelocity * PHYSICS.jumpVelocity) / (2 * PHYSICS.gravity);

const FALL_GRAVITY = PHYSICS.gravity * PHYSICS.fallGravityMultiplier;
const TIME_TO_APEX = Math.abs(PHYSICS.jumpVelocity) / PHYSICS.gravity;
const TIME_APEX_TO_START_HEIGHT = Math.sqrt((2 * MAX_JUMP_RISE_PX) / FALL_GRAVITY);

/** Horizontal distance a full-held jump covers landing back at the takeoff height. */
export const REACH_AT_SAME_HEIGHT_PX = PHYSICS.moveSpeed * (TIME_TO_APEX + TIME_APEX_TO_START_HEIGHT);

/** Horizontal distance covered by the time a full-held jump reaches its absolute peak. */
export const REACH_AT_APEX_PX = PHYSICS.moveSpeed * TIME_TO_APEX;

/**
 * Seconds a full-held jump spends in the air before landing on a surface
 * `risePx` above the takeoff point (zero or negative for level ground).
 *
 * The same two-phase flight as `maxHorizontalReach` below, expressed as time
 * rather than distance — they describe one jump, and they live together so
 * one cannot drift from the other. Returns 0 for a rise the jump cannot
 * make, matching `maxHorizontalReach`'s own answer for the unreachable case.
 */
export function jumpAirTimeSec(risePx: number): number {
  if (risePx > MAX_JUMP_RISE_PX) return 0;
  const dropFromApex = MAX_JUMP_RISE_PX - Math.max(0, risePx);
  return TIME_TO_APEX + Math.sqrt((2 * dropFromApex) / FALL_GRAVITY);
}

/**
 * Seconds to fall `dropPx` from rest — walking off an edge rather than
 * jumping. Descending uses `fallGravityMultiplier`, same as `Player.ts`.
 */
export function fallTimeSec(dropPx: number): number {
  return dropPx <= 0 ? 0 : Math.sqrt((2 * dropPx) / FALL_GRAVITY);
}

/**
 * Conservative horizontal reach for a jump from a surface to a target whose
 * surface is `riseAboveStartPx` higher than the start (negative or zero for
 * a target at or below the start). Mirrors the two-phase gravity model in
 * `Player.ts` (base gravity ascending, `fallGravityMultiplier` descending)
 * so this never silently drifts from what the game actually simulates.
 *
 * Platforms in this game are one-way (passable from below, solid from
 * above — see `GameplayScene.isLandingOnPlatform`), so an elevated target is
 * necessarily landed on during the *descent* after the apex, not on the way
 * up. That's why reach at a target near the apex is the *smallest* (least
 * total air time), not the largest — this used to be modeled backwards
 * (using the ascending crossing) and produced physically wrong, larger
 * numbers near the apex; the descending model below is the one that
 * actually matches how landings work in this game.
 *
 * Scope: this answers "can a full-held straight jump geometrically cover
 * this horizontal/vertical gap" — it does not simulate acceleration ramp-up,
 * mid-air obstruction, or partial jumps. That makes it a lower bound (some
 * real jumps could reach slightly further); it must never return a distance
 * larger than what the game can actually do, since `LevelValidator` treats
 * this as the ground truth for "is this level physically passable."
 */
export function maxHorizontalReach(riseAboveStartPx: number): number {
  if (riseAboveStartPx > MAX_JUMP_RISE_PX) return 0;
  if (riseAboveStartPx <= 0) return REACH_AT_SAME_HEIGHT_PX;

  const dropFromApex = MAX_JUMP_RISE_PX - riseAboveStartPx;
  const timeDown = Math.sqrt((2 * dropFromApex) / FALL_GRAVITY);
  return PHYSICS.moveSpeed * (TIME_TO_APEX + timeDown);
}
