import { PHYSICS, PLAYER_HURT_BOX_HEIGHT, PLAYER_HURT_BOX_WIDTH } from '@/config/physics';
import { TILE_SIZE } from '@/config/display';
import { MAX_JUMP_RISE_PX } from '@/gameplay/jumpPhysics';
import { type Segment, solvePath } from '@/gameplay/LevelValidator';
import type { LevelDef } from '@/gameplay/LevelDef';
import type { TrapDef } from '@/traps/TrapDef';

/**
 * WHERE THE ANDROID'S BODY ACTUALLY GOES along the route the solver proves,
 * as a list of rectangles.
 *
 * WHY THIS EXISTS. On 2026-09-19 a patrolling spike was added to
 * `sector-10-level-06` three tiles from the exit. It passed 1699 tests, the
 * solver signed the level off, the hazard-window probe measured it, and it
 * could not touch the player: the hop it was supposed to guard reaches its
 * apex at that column with the hurt box ending at y=95, and the spike ran
 * from y=110. Fifteen pixels of clear air on every attempt. The owner found
 * it by looking at it — «бесполезный шип у портала».
 *
 * Nothing the project had could have caught that. `LevelValidator` proves a
 * route EXISTS; it says nothing about what the route passes through.
 * `parTime` walks the same route for its duration and only ever asks how
 * long a leg takes. Every trap test is about placement rules — is this
 * telegraphed, is it over a pit, is it on the exit column — and a trap in
 * empty air breaks none of them. The missing question was the simplest one:
 * can the player ever be where this thing is.
 *
 * WHAT IT IS NOT. This traces the SOLVED route, which is one route. A level
 * may have others — sector 07's `OFFBEAT` is built on exactly that, a fast
 * way under the spikes and a slow way around them — so a trap this never
 * touches is not automatically dead. It is a question to answer, which is
 * why `pnpm levels` reports those traps rather than failing on them.
 */
export interface TraceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The hurt box, centred on the feet position the way `Player.hurtBounds` does. */
function bodyAt(x: number, feetY: number): TraceBox {
  return { x: x - PLAYER_HURT_BOX_WIDTH / 2, y: feetY - PLAYER_HURT_BOX_HEIGHT, w: PLAYER_HURT_BOX_WIDTH, h: PLAYER_HURT_BOX_HEIGHT };
}

/** Centre of a tile column, in px — the same convention level data is written in. */
function colX(col: number): number {
  return col * TILE_SIZE + TILE_SIZE / 2;
}

/**
 * Samples one transfer between two surfaces, with the real ballistics.
 *
 * NOT AN APPROXIMATE ARC. The first version of this drew a symmetric
 * parabola through the two endpoints with a hand-picked peak, and it was
 * wrong in both directions at once: too high over short hops, so it invented
 * overlaps, and the wrong shape over long ones, so it missed real ones. The
 * question being asked is exactly the one answered by hand when the useless
 * spike was found — where are the android's feet when it crosses this column
 * — and that is `y = y0 + v0·t + ½·g·t²` with `x = x0 ± moveSpeed·t`, the
 * same three constants the game runs on.
 *
 * TWO TRAJECTORIES, NOT ONE, because a player crossing a gap downward has a
 * choice the geometry does not record: jump, or walk off the edge. Both are
 * sampled and the result is their union — the body could have been on either.
 * A launch pad is the exception with no choice in it: `Player.launch` sets
 * the velocity itself and disables the cut, so the arc is the pad's.
 */
function arcBoxes(fromX: number, fromFeetY: number, toX: number, toFeetY: number, liftPx: number): TraceBox[] {
  const boxes: TraceBox[] = [];
  const risePx = fromFeetY - toFeetY;
  const launched = liftPx > 0 && risePx > MAX_JUMP_RISE_PX;
  const initialVelocities = launched
    ? [-Math.sqrt(2 * PHYSICS.gravity * liftPx)]
    : risePx > 0
      ? [PHYSICS.jumpVelocity]
      : [PHYSICS.jumpVelocity, 0];

  const dir = Math.sign(toX - fromX);
  const span = Math.abs(toX - fromX);
  for (const v0 of initialVelocities) {
    // Long enough to cover the flight either way: the descent to the landing
    // row, plus the horizontal run, whichever finishes last.
    const riseSec = -v0 / PHYSICS.gravity;
    const dropPx = Math.max(fromFeetY - toFeetY, 0) + (-v0 * riseSec + 0.5 * PHYSICS.gravity * riseSec * riseSec);
    const totalSec = riseSec + Math.sqrt((2 * Math.max(dropPx, 0)) / PHYSICS.gravity) + 0.05;
    const runSec = span > 0 ? span / PHYSICS.moveSpeed : 0;
    const flightSec = Math.max(totalSec, runSec);
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = (flightSec * i) / steps;
      const x = dir === 0 ? fromX : Math.min(Math.max(fromX + dir * PHYSICS.moveSpeed * t, Math.min(fromX, toX)), Math.max(fromX, toX));
      const y = fromFeetY + v0 * t + 0.5 * PHYSICS.gravity * t * t;
      boxes.push(bodyAt(x, y));
      // THE FLIGHT ENDS ON THE LANDING SURFACE, and getting this wrong is
      // how the detector first said the useless spike was fine. The stop was
      // written as "below the lower of the two ends", which for a jump UP is
      // the take-off row — thirty pixels under the ledge being landed on. The
      // trace kept falling through the platform and clipped the very hazard
      // the real android lands three tiles above.
      //
      // The body stops where the floor is: descending, and level with the
      // surface it is arriving on.
      if (t > 0 && v0 + PHYSICS.gravity * t >= 0 && y >= toFeetY) break;
    }
  }
  return boxes;
}

/**
 * Every place the android's hurt box can be while following the proved
 * route: standing along each surface it uses, and in the air between them.
 * `null` for a level the solver cannot finish, which cannot reach the game.
 */
export function routeBodyBoxes(def: LevelDef): TraceBox[] | null {
  const path = solvePath(def);
  if (path === null || path.length === 0) return null;

  const liftByCol = new Map<number, number>();
  for (const trap of def.traps ?? []) {
    if (trap.type !== 'launch-pad') continue;
    for (let col = trap.col; col < trap.col + trap.width; col++) {
      liftByCol.set(col, Math.max(liftByCol.get(col) ?? 0, trap.liftTiles * TILE_SIZE));
    }
  }

  const boxes: TraceBox[] = [];
  const feetOf = (row: number): number => row * TILE_SIZE;
  let at = def.playerStartCol;

  const walk = (fromCol: number, toCol: number, row: number): void => {
    const lo = Math.min(fromCol, toCol);
    const hi = Math.max(fromCol, toCol);
    for (let col = lo; col <= hi; col++) boxes.push(bodyAt(colX(col), feetOf(row)));
  };

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i] as Segment;
    const to = path[i + 1] as Segment;
    let departCol: number;
    let landCol: number;
    if (to.fromCol > from.toCol) {
      departCol = from.toCol;
      landCol = to.fromCol;
    } else if (to.toCol < from.fromCol) {
      departCol = from.fromCol;
      landCol = to.toCol;
    } else {
      departCol = Math.min(Math.max(at, Math.max(from.fromCol, to.fromCol)), Math.min(from.toCol, to.toCol));
      landCol = departCol;
    }
    walk(at, departCol, from.row);
    boxes.push(...arcBoxes(colX(departCol), feetOf(from.row), colX(landCol), feetOf(to.row), liftByCol.get(departCol) ?? 0));
    at = landCol;
  }

  const last = path[path.length - 1] as Segment;
  walk(at, def.exitCol, last.row);
  return boxes;
}

/** True when the player's body ever reaches the rectangle, following the proved route. */
export function routeTouches(def: LevelDef, box: TraceBox): boolean {
  const boxes = routeBodyBoxes(def);
  if (boxes === null) return false;
  return boxes.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h);
}

/**
 * The space a trap can kill in, or `null` for one that never kills.
 *
 * Deliberately generous — the whole travel of anything that moves, not where
 * it happens to be. A trap flagged by this could not touch the player at ANY
 * point of its cycle, which is a much stronger statement than "it missed".
 */
export function trapLethalBox(trap: TrapDef): TraceBox | null {
  const box = (fromCol: number, toCol: number, fromRow: number, toRow: number): TraceBox => ({
    x: Math.min(fromCol, toCol) * TILE_SIZE,
    y: Math.min(fromRow, toRow) * TILE_SIZE,
    w: (Math.abs(toCol - fromCol) + 1) * TILE_SIZE,
    h: (Math.abs(toRow - fromRow) + 1) * TILE_SIZE,
  });
  switch (trap.type) {
    case 'moving-spike':
      return box(trap.fromCol, trap.toCol, trap.fromRow, trap.toRow);
    case 'laser':
    case 'timing-gate':
      return box(trap.col, trap.col, trap.topRow, trap.bottomRow);
    case 'spike-bank':
      return box(trap.col, trap.col + trap.width - 1, trap.hiddenRow, trap.lethalRow);
    case 'electric-floor':
      return box(trap.col, trap.col + trap.width - 1, trap.row - 1, trap.row);
    case 'orbit-spike':
      return box(
        Math.floor(trap.pivotCol - trap.radiusTiles),
        Math.ceil(trap.pivotCol + trap.radiusTiles),
        Math.floor(trap.pivotRow - trap.radiusTiles),
        Math.ceil(trap.pivotRow + trap.radiusTiles),
      );
    case 'swinging-spike':
      return box(
        Math.floor(trap.pivotCol - trap.lengthTiles),
        Math.ceil(trap.pivotCol + trap.lengthTiles),
        trap.pivotRow,
        Math.ceil(trap.pivotRow + trap.lengthTiles),
      );
    case 'loop-spike': {
      const cols = trap.waypoints.map((w) => w.col);
      const rows = trap.waypoints.map((w) => w.row);
      return box(Math.min(...cols), Math.max(...cols), Math.min(...rows), Math.max(...rows));
    }
    case 'spike-wall': {
      const reach = trap.fromRight === true ? trap.col - trap.extendTiles : trap.col + trap.extendTiles;
      return box(trap.col, reach, trap.topRow ?? 0, trap.bottomRow ?? trap.topRow ?? 0);
    }
    default:
      // Pads, belts, platforms, triggers, decoys and the pursuer: either
      // harmless, or (the pursuer) a thing that goes wherever the player
      // does, which makes "can it reach them" a question with one answer.
      return null;
  }
}

/** Ids of traps the proved route never brings the player's body into. */
export function trapsTheRouteNeverMeets(def: LevelDef): string[] {
  const boxes = routeBodyBoxes(def);
  if (boxes === null) return [];
  const out: string[] = [];
  for (const trap of def.traps ?? []) {
    const box = trapLethalBox(trap);
    if (box === null) continue;
    if (!boxes.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) {
      out.push(trap.id);
    }
  }
  return out;
}

/** Rows a walking player occupies over a surface — used by the reports above. */
export const STANDING_BODY_TILES = PLAYER_HURT_BOX_HEIGHT / TILE_SIZE;

/** Horizontal speed the trace assumes, kept next to it so the two cannot drift. */
export const TRACE_MOVE_SPEED = PHYSICS.moveSpeed;
