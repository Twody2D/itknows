import { TILE_SIZE } from '@/config/display';
import { PHYSICS } from '@/config/physics';
import type { LevelDef } from './LevelDef';
import type { Segment } from './LevelValidator';
import { solvePath } from './LevelValidator';
import { MAX_JUMP_RISE_PX, fallTimeSec, jumpAirTimeSec, launchReach, usableLiftPx } from './jumpPhysics';
import { effectiveWalkSpeed } from './conveyor';
import { DEFAULT_TRAP_TIMING } from '@/traps/TrapTiming';
import type { TrapDef } from '@/traps/TrapDef';

/**
 * How long a clean run of a level ought to take — the number the third star
 * is measured against (`stars.ts`).
 *
 * WHY THIS IS DERIVED AND NOT TYPED IN. Thirty levels today and sixty soon:
 * hand-picking a target time for each is thirty numbers nobody can defend,
 * and the first one that is wrong makes a third star unobtainable on a level
 * that is otherwise fine. So the default comes from the level's own geometry,
 * walked along the same path the solver uses to prove the level passable —
 * if the route changes, the target moves with it instead of going stale.
 *
 * WHAT IT IS NOT. This is not a simulation and does not pretend to be one.
 * `floorMs` below is a genuine floor — no player beats it, because it is the
 * time the physics alone take. Everything added on top is an allowance for
 * what geometry cannot see: waiting for a hazard's window, overshooting a
 * ledge, not holding right for the whole level. That allowance is a
 * judgement, which is exactly why `LevelDef.starTimeMs` exists — a level
 * whose real pace this misjudges gets its number set by hand, after being
 * played, and `tests/par-time.test.ts` only insists that no such number ever
 * drops below the floor.
 */

/**
 * Expected wait at a timed hazard, as a fraction of its cycle: arriving at a
 * random moment, the window is on average half a cycle away, and often
 * already open.
 */
const HAZARD_WAIT_FRACTION = 0.5;

/**
 * Multiplier on the physical floor — the allowance for being a person.
 *
 * The floor assumes the player accelerates instantly, never overshoots a
 * ledge, never re-approaches a jump and holds one direction from spawn to
 * exit. Nobody does that. A par is not a record either: the third star is
 * meant to say "you know this level", not "your input was frame-accurate".
 *
 * It multiplies the floor and NOT the hazard allowance, which is already an
 * expected wait and must not be inflated twice. Applied to the sum instead,
 * a level with no timed hazard (DROP, GHOST FLOOR) came out at 1.27x its own
 * floor while a hazard-heavy one got 2.4x — the levels with the least
 * cushion were the ones given the least slack.
 *
 * RAISED FROM 1.8 ON 2026-09-19, and by measurement rather than by feel. The
 * owner played the finished campaign end to end and reported «сложно
 * получить 3 звезды на уровнях». That run was sixty levels in eleven
 * minutes — about 11 s a level including deaths, restarts and the menus in
 * between — against a mean par of 9.0 s at 1.8x. So the third star was
 * asking a player to beat their own natural pace on every level in the game
 * AND never die, when never dying is already the second star's whole job.
 * At 2.4 the mean par is about 11 s: the pace of somebody who knows the
 * level, which is what the paragraph above says this number is for.
 */
const FLOOR_SLACK = 2.4;

/** Columns a trap occupies, and the cycle a player may have to wait out, or `null` for a trap that costs no time to pass. */
function hazardSpan(trap: TrapDef): { fromCol: number; toCol: number; cycleMs: number } | null {
  const cycleOf = (timing = DEFAULT_TRAP_TIMING): number =>
    timing.idleMs + timing.warningMs + timing.activeMs + timing.cooldownMs;

  switch (trap.type) {
    case 'laser':
    case 'timing-gate':
      return { fromCol: trap.col, toCol: trap.col, cycleMs: cycleOf(trap.timing) };
    case 'electric-floor':
    case 'spike-bank':
      return { fromCol: trap.col, toCol: trap.col + trap.width - 1, cycleMs: cycleOf(trap.timing) };
    case 'launch-pad':
      // Not a hazard, but it costs exactly the same thing: the player stands
      // on the pad and waits for it to fire. A route up a launcher is slower
      // than the geometry alone suggests, and this is where that shows up.
      return { fromCol: trap.col, toCol: trap.col + trap.width - 1, cycleMs: cycleOf(trap.timing) };
    case 'spike-wall': {
      const reach = trap.fromRight === true ? trap.col - trap.extendTiles : trap.col + trap.extendTiles;
      return { fromCol: Math.min(trap.col, reach), toCol: Math.max(trap.col, reach), cycleMs: cycleOf(trap.timing) };
    }
    case 'moving-spike':
      return {
        fromCol: Math.min(trap.fromCol, trap.toCol),
        toCol: Math.max(trap.fromCol, trap.toCol),
        // An ambush spike runs the shared phase cycle; an ordinary patrol is
        // timed by its own travel instead.
        cycleMs: trap.ambush === true ? cycleOf(trap.timing) : (trap.travelMs ?? 0),
      };
    case 'orbit-spike':
      return {
        fromCol: Math.floor(trap.pivotCol - trap.radiusTiles),
        toCol: Math.ceil(trap.pivotCol + trap.radiusTiles),
        cycleMs: trap.periodMs,
      };
    case 'swinging-spike':
      return {
        fromCol: Math.floor(trap.pivotCol - trap.lengthTiles),
        toCol: Math.ceil(trap.pivotCol + trap.lengthTiles),
        cycleMs: trap.periodMs,
      };
    case 'loop-spike': {
      const cols = trap.waypoints.map((w) => w.col);
      return {
        fromCol: Math.min(...cols),
        toCol: Math.max(...cols),
        cycleMs: trap.travelMs * trap.waypoints.length,
      };
    }
    default:
      // Everything else costs no waiting: a fake or falling platform is paid
      // for by falling, not by standing still, and a trigger is not a hazard.
      return null;
  }
}

const walkSecPerCol = TILE_SIZE / PHYSICS.moveSpeed;

/**
 * Seconds to walk from one column to another, with the conveyors under that
 * stretch taken into account.
 *
 * A belt adds to the player's ground speed going with it and subtracts going
 * against it (`GameplayScene.carryOnConveyors` moves them by displacement, so
 * the two simply sum). Modelling it is not a refinement — it is the
 * difference between a target time and a broken promise: a level whose
 * route runs ten tiles upstream against 60 px/s takes 2.0 s where the flat
 * estimate says 0.9, and the third star would be unobtainable on a level
 * that is otherwise fine, which is exactly what CLAUDE.md #4.8 forbids.
 */
function walkSec(fromCol: number, toCol: number, beltByCol: Map<number, number>): number {
  if (fromCol === toCol) return 0;
  const step = toCol > fromCol ? 1 : -1;
  let seconds = 0;
  for (let col = fromCol; col !== toCol; col += step) {
    // Slowest of the two tiles a step spans, so a single upstream tile is
    // never averaged away.
    const belt = beltByCol.get(col + (step > 0 ? 1 : 0)) ?? beltByCol.get(col) ?? 0;
    const speed = effectiveWalkSpeed(belt, step as 1 | -1);
    seconds += TILE_SIZE / speed;
  }
  return seconds;
}

/** Where the player leaves `from` heading for `to`, and where they land on `to`. */
function transferColumns(from: Segment, to: Segment, at: number): { departCol: number; landCol: number } {
  if (to.fromCol > from.toCol) return { departCol: from.toCol, landCol: to.fromCol };
  if (to.toCol < from.fromCol) return { departCol: from.fromCol, landCol: to.toCol };
  // The two overlap, so the transfer is straight up or straight down and the
  // player need not walk anywhere to make it.
  const shared = Math.min(Math.max(at, Math.max(from.fromCol, to.fromCol)), Math.min(from.toCol, to.toCol));
  return { departCol: shared, landCol: shared };
}

export interface ParBreakdown {
  /** Time the physics alone take along the solved route. No player beats this. */
  floorMs: number;
  /** Allowance for waiting out the timed hazards that route crosses. */
  hazardMs: number;
  /** The target a third star is measured against. */
  parMs: number;
}

/**
 * Walks the solved route and adds up how long it physically takes, then adds
 * the hazard allowance and the slack. Returns `null` for a level the solver
 * cannot complete — which `LevelValidator` already refuses to ship.
 */
export function parBreakdown(def: LevelDef): ParBreakdown | null {
  const path = solvePath(def);
  if (path === null || path.length === 0) return null;

  // Lift available at each column, for the transfers a jump cannot explain.
  const liftByCol = new Map<number, number>();
  for (const trap of def.traps ?? []) {
    if (trap.type !== 'launch-pad') continue;
    for (let col = trap.col; col < trap.col + trap.width; col++) {
      liftByCol.set(col, Math.max(liftByCol.get(col) ?? 0, usableLiftPx(trap.liftTiles * TILE_SIZE)));
    }
  }

  // Belt speed under each column, for the walking legs below.
  const beltByCol = new Map<number, number>();
  for (const trap of def.traps ?? []) {
    if (trap.type !== 'conveyor') continue;
    for (let col = trap.col; col < trap.col + trap.width; col++) beltByCol.set(col, trap.speed);
  }

  let seconds = 0;
  let at = def.playerStartCol;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i] as Segment;
    const to = path[i + 1] as Segment;
    const { departCol, landCol } = transferColumns(from, to, at);

    seconds += walkSec(at, departCol, beltByCol);

    const risePx = (from.row - to.row) * TILE_SIZE;
    const gapSec = Math.abs(landCol - departCol) * walkSecPerCol;
    // Horizontal distance is covered during the flight, not after it, so a
    // transfer costs whichever of the two is longer — never their sum.
    //
    // A rise no jump can make was made by a launch pad, and has to be timed
    // as one: `jumpAirTimeSec` answers 0 for an impossible jump, so leaving
    // it to that would have quietly scored the longest flight in the level
    // as instantaneous and handed the level a target time nobody could meet.
    const liftPx = liftByCol.get(departCol) ?? 0;
    const flightSec =
      risePx <= 0
        ? fallTimeSec(-risePx)
        : risePx > MAX_JUMP_RISE_PX && liftPx > 0
          ? launchReach(liftPx, risePx) / PHYSICS.moveSpeed
          : jumpAirTimeSec(risePx);
    seconds += Math.max(gapSec, flightSec);

    at = landCol;
  }

  // The exit is reached by walking to it along the last surface.
  seconds += walkSec(at, def.exitCol, beltByCol);

  const floorMs = Math.round(seconds * 1000);

  const routeFrom = Math.min(def.playerStartCol, def.exitCol, ...path.map((s) => s.fromCol));
  const routeTo = Math.max(def.playerStartCol, def.exitCol + 1, ...path.map((s) => s.toCol));
  let hazardMs = 0;
  for (const trap of def.traps ?? []) {
    const span = hazardSpan(trap);
    if (span === null) continue;
    if (span.toCol < routeFrom || span.fromCol > routeTo) continue;
    hazardMs += span.cycleMs * HAZARD_WAIT_FRACTION;
  }
  hazardMs = Math.round(hazardMs);

  return { floorMs, hazardMs, parMs: Math.round(floorMs * FLOOR_SLACK + hazardMs) };
}

/**
 * The level's own `starTimeMs` when it has one, otherwise the derived
 * default. `null` only for a level with no solvable route, which cannot
 * reach the game.
 */
export function parTimeMs(def: LevelDef): number | null {
  if (def.starTimeMs !== undefined) return def.starTimeMs;
  return parBreakdown(def)?.parMs ?? null;
}

/** Kept for the tests: the floor a hand-set `starTimeMs` must never fall below. */
export function parFloorMs(def: LevelDef): number | null {
  return parBreakdown(def)?.floorMs ?? null;
}
