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
 * Upward velocity that carries the player exactly `liftPx` above the launch
 * point — what a `launch-pad` imparts.
 *
 * Negative, like `PHYSICS.jumpVelocity`, because up is negative here. Derived
 * from the same ascending gravity a jump uses, so a pad's advertised lift in
 * tiles is the height the player actually gains rather than a number tuned by
 * eye until it looked right.
 */
export function launchVelocity(liftPx: number): number {
  return -Math.sqrt(2 * PHYSICS.gravity * clampLift(liftPx));
}

/**
 * The highest lift the game can actually deliver, in px.
 *
 * `Player` clamps its body to `PHYSICS.maxFallSpeed` in BOTH vertical
 * directions (`setMaxVelocity`), so an upward impulse past that speed is
 * silently trimmed by Arcade. Measured live before this was handled: a pad
 * advertising 12 tiles lifted 10.1, with the velocity pinned at exactly
 * -420. That is the dangerous kind of wrong — `LevelValidator` certifies a
 * level against the lift the data claims, so a pad asking for more than the
 * body can give would prove a level passable that the player cannot finish.
 *
 * Every launch calculation goes through `clampLift`, so the solver and the
 * game agree even on a level authored with too large a number; the sanity
 * test then refuses that number outright rather than letting it pass quietly.
 */
export const MAX_LAUNCH_LIFT_PX = (PHYSICS.maxFallSpeed * PHYSICS.maxFallSpeed) / (2 * PHYSICS.gravity);

function clampLift(liftPx: number): number {
  return Math.min(MAX_LAUNCH_LIFT_PX, Math.max(0, liftPx));
}

/** Arcade's fixed physics step. */
const PHYSICS_STEP_SEC = 1 / 60;

/**
 * The lift a launch really delivers, which is slightly less than the impulse
 * implies — what `LevelValidator` must plan against.
 *
 * The body integrates in discrete steps, so gravity is charged for a whole
 * frame that the ideal continuous arc never pays. Measured live: a pad set to
 * 9 tiles lifted 8.70, with the peak velocity right where the maths put it
 * (-402). The gap is one frame of gravity, not a bug in the impulse.
 *
 * A full frame is subtracted rather than the half the arithmetic suggests,
 * because this number has to be a LOWER bound for the same reason
 * `maxHorizontalReach` is: a solver that plans against a lift the game
 * delivers only on a good frame would certify a climb the player sometimes
 * cannot make, and "sometimes" is the worst possible failure for a rule the
 * whole campaign is checked against.
 */
export function usableLiftPx(liftPx: number): number {
  const lift = clampLift(liftPx);
  return Math.max(0, lift - Math.sqrt(2 * PHYSICS.gravity * lift) * PHYSICS_STEP_SEC);
}

/**
 * Horizontal distance a launch of `liftPx` covers before landing on a surface
 * `risePx` above the pad.
 *
 * The launcher's counterpart to `maxHorizontalReach`, and the same two-phase
 * model: ascending under base gravity, descending under
 * `fallGravityMultiplier`. Returns 0 when the launch cannot gain the height
 * at all, so a caller that treats 0 as "unreachable" needs no special case.
 *
 * Like its sibling this is a LOWER bound — it ignores the extra distance a
 * player covers by jumping at the top of the arc — because `LevelValidator`
 * treats it as ground truth for whether a level is passable, and a reach
 * that overstates what the game can do would certify a level nobody can
 * finish.
 */
export function launchReach(liftPx: number, risePx: number): number {
  const lift = clampLift(liftPx);
  if (risePx > lift) return 0;
  const timeUp = Math.sqrt((2 * lift) / PHYSICS.gravity);
  const timeDown = Math.sqrt((2 * (lift - Math.max(0, risePx))) / FALL_GRAVITY);
  return PHYSICS.moveSpeed * (timeUp + timeDown);
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
