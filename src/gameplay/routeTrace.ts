import { PHYSICS, PLAYER_HURT_BOX_HEIGHT, PLAYER_HURT_BOX_WIDTH, TRAP_HITBOX } from '@/config/physics';
import { TILE_SIZE } from '@/config/display';

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

/** How finely a flight is sampled, in seconds — 5 ms is under a pixel of horizontal travel. */
const ARC_SAMPLE_SEC = 0.005;

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
 * THE FLIGHT WINDOW IS SOLVED, NOT ESTIMATED. It used to be assembled out of
 * a rise term that was three times the real apex added to a drop term that is
 * zero for every descent — which came to 0.81 s for any fall, however deep,
 * so a drop of more than about nine tiles ran out of samples 78 px above the
 * floor and the loop's own stop condition could never fire. The campaign's
 * deepest transfer is three tiles, so nothing shipped was mis-traced; the
 * next level with a long fall in it would have been. `t` now comes from
 * solving `½·g·t² + v0·t + (fromFeetY − toFeetY) = 0`, which is the same
 * equation the sampling loop walks.
 *
 * TWO TRAJECTORIES, NOT ONE, because a player crossing a gap downward has a
 * choice the geometry does not record: jump, or walk off the edge. Both are
 * sampled and the result is their union — the body could have been on either.
 * Leaving a launch pad adds a third: `Player.launch` sets the velocity itself
 * and disables the cut, so that arc is the pad's and nothing else's.
 */
function arcBoxes(
  fromX: number,
  fromFeetY: number,
  toX: number,
  toFeetY: number,
  liftPx: number,
): TraceBox[] {
  const boxes: TraceBox[] = [];
  const risePx = fromFeetY - toFeetY;
  // A PAD FIRES WHENEVER IT IS LEFT, not only when the destination is out of
  // jump range. The old test was `risePx > MAX_JUMP_RISE_PX`, so a pad used
  // as a horizontal bridge — sector 06's CROSSING throws the player eight
  // tiles across a pit at the same height — was traced as an ordinary jump:
  // 45 px too low, ending in mid-air over the gap. Both arcs are sampled
  // now, because a pad that only fires on its own cycle can also be walked
  // off between shots, and the union is where the body can be.
  const initialVelocities: number[] = risePx > 0 ? [PHYSICS.jumpVelocity] : [PHYSICS.jumpVelocity, 0];
  if (liftPx > 0) initialVelocities.push(-Math.sqrt(2 * PHYSICS.gravity * liftPx));

  const dir = Math.sign(toX - fromX);
  const span = Math.abs(toX - fromX);
  for (const v0 of initialVelocities) {
    // Time until the feet are back level with the landing surface. A
    // negative discriminant means this trajectory never gets that high, in
    // which case the apex is as far as it is worth sampling.
    const disc = v0 * v0 - 2 * PHYSICS.gravity * risePx;
    const landSec = disc >= 0 ? (-v0 + Math.sqrt(disc)) / PHYSICS.gravity : -v0 / PHYSICS.gravity;
    const runSec = span > 0 ? span / PHYSICS.moveSpeed : 0;
    const flightSec = Math.max(landSec + 0.05, runSec);
    const steps = Math.max(8, Math.ceil(flightSec / ARC_SAMPLE_SEC));
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
 * True for the two ends of one moving platform, which `LevelValidator` joins
 * with a ride rather than a jump (`platformSegments`).
 */
function isRide(from: Segment, to: Segment): boolean {
  const ride = /^moving-platform-(.+)@(start|end)$/;
  const a = ride.exec(from.label);
  const b = ride.exec(to.label);
  return a !== null && b !== null && a[1] === b[1] && a[2] !== b[2];
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

  /** Standing on the deck for the whole of a moving platform's trip. */
  const rideBoxes = (fromCol: number, fromRow: number, toCol: number, toRow: number): void => {
    const steps = Math.max(1, Math.abs(toCol - fromCol));
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      boxes.push(bodyAt(colX(fromCol + (toCol - fromCol) * k), feetOf(fromRow + (toRow - fromRow) * k)));
    }
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
    if (isRide(from, to)) {
      // CARRIED, NOT JUMPED. `LevelValidator` joins a moving platform's two
      // ends with a ride edge — the player stands still and the slab does
      // the work — and tracing that as a jump put the body on an arc it
      // never flies and never over the middle of the crossing at deck
      // height, which is exactly where a rider spends the whole trip. On
      // BRIDGE that is ten tiles the detector could not see the player in.
      rideBoxes(departCol, from.row, landCol, to.row);
    } else {
      boxes.push(...arcBoxes(colX(departCol), feetOf(from.row), colX(landCol), feetOf(to.row), liftByCol.get(departCol) ?? 0));
    }
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
 * Arcade's size/offset for the traps that move, reshaped into an offset from
 * the sprite's centre. The numbers themselves are `TRAP_HITBOX` in
 * `config/physics.ts`, which the trap classes hand to Arcade directly, so the
 * two cannot drift apart.
 *
 * They are the reason this section was rewritten. The first version rounded
 * every hazard up to whole tiles — a 3 px laser beam became a 10 px column, a
 * 6 px spike became its tile, a pendulum became the square its arc fits in —
 * and because a trap is only reported when NOTHING on the route overlaps it,
 * every invented pixel is a chance to call a dead trap live. RELAY's beam was
 * exactly that: a 3 px beam standing inside the exit door's catch zone,
 * passed by the detector because its inflated tile clipped a walk box one
 * pixel away. The classes read the same constants, so they cannot drift.
 */
interface Hitbox {
  w: number;
  h: number;
  dx: number;
  dy: number;
}

function shapeOf(box: { width: number; height: number; offsetX: number; offsetY: number }): Hitbox {
  return {
    w: box.width,
    h: box.height,
    dx: box.offsetX - TILE_SIZE / 2,
    dy: box.offsetY - TILE_SIZE / 2,
  };
}

const HITBOX = {
  /** The base of the tile, on every ground-mounted spike. */
  spikeBase: shapeOf(TRAP_HITBOX.spikeBase),
  /** Centred, on everything that swings, orbits or loops through open air. */
  spikeCentre: shapeOf(TRAP_HITBOX.spikeCentred),
} as const;

/** How finely a curved or travelling hazard is sampled along its path, in px of travel. */
const HAZARD_SAMPLE_PX = 2;

/** A hitbox of the given shape, centred on a sprite centre. */
function hitboxAt(cx: number, cy: number, shape: Hitbox): TraceBox {
  return { x: cx + shape.dx, y: cy + shape.dy, w: shape.w, h: shape.h };
}

/** Samples a straight run of sprite centres, endpoints included. */
function sampleLine(x0: number, y0: number, x1: number, y1: number, shape: Hitbox): TraceBox[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / HAZARD_SAMPLE_PX));
  const out: TraceBox[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    out.push(hitboxAt(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, shape));
  }
  return out;
}

/** Samples an arc of sprite centres swung from a pivot, endpoints included. */
function sampleArc(
  pivotX: number,
  pivotY: number,
  radius: number,
  fromRad: number,
  toRad: number,
  shape: Hitbox,
): TraceBox[] {
  const steps = Math.max(1, Math.ceil((Math.abs(toRad - fromRad) * radius) / HAZARD_SAMPLE_PX));
  const out: TraceBox[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = fromRad + ((toRad - fromRad) * i) / steps;
    out.push(hitboxAt(pivotX + radius * Math.sin(a), pivotY + radius * Math.cos(a), shape));
  }
  return out;
}

/**
 * Every place a trap can kill, or an empty list for one that never kills.
 *
 * Generous in TIME and exact in SPACE: the whole travel of anything that
 * moves, because a trap has a whole cycle to catch the player in, but the
 * real hitbox at every point of it, because a trap flagged by this is about
 * to be deleted or moved and the claim being made is that the player can
 * never be there.
 */
export function trapLethalBoxes(trap: TrapDef): TraceBox[] {
  const centre = (col: number, row: number): [number, number] => [colX(col), row * TILE_SIZE + TILE_SIZE / 2];
  switch (trap.type) {
    case 'moving-spike': {
      const [x0, y0] = centre(trap.fromCol, trap.fromRow);
      const [x1, y1] = centre(trap.toCol, trap.toRow);
      return sampleLine(x0, y0, x1, y1, HITBOX.spikeBase);
    }
    case 'laser':
    case 'timing-gate': {
      const w = trap.type === 'laser' ? TRAP_HITBOX.laserWidth : TRAP_HITBOX.timingGateWidth;
      return [
        {
          x: colX(trap.col) - w / 2,
          y: trap.topRow * TILE_SIZE,
          w,
          h: (trap.bottomRow + 1 - trap.topRow) * TILE_SIZE,
        },
      ];
    }
    case 'spike-bank': {
      const out: TraceBox[] = [];
      for (let i = 0; i < trap.width; i++) {
        const [x, yHidden] = centre(trap.col + i, trap.hiddenRow);
        const [, yLethal] = centre(trap.col + i, trap.lethalRow);
        out.push(...sampleLine(x, yHidden, x, yLethal, HITBOX.spikeBase));
      }
      return out;
    }
    case 'electric-floor':
      // `ElectricFloorTrap`'s zone is one tile tall, straddling the surface
      // line — not the two rows the first version of this claimed.
      return [
        {
          x: trap.col * TILE_SIZE,
          y: trap.row * TILE_SIZE - TILE_SIZE / 2,
          w: trap.width * TILE_SIZE,
          h: TILE_SIZE,
        },
      ];
    case 'orbit-spike': {
      const [px, py] = centre(trap.pivotCol, trap.pivotRow);
      return sampleArc(px, py, trap.radiusTiles * TILE_SIZE, 0, Math.PI * 2, HITBOX.spikeCentre);
    }
    case 'swinging-spike': {
      const [px, py] = centre(trap.pivotCol, trap.pivotRow);
      const max = (trap.maxAngleDeg * Math.PI) / 180;
      return sampleArc(px, py, trap.lengthTiles * TILE_SIZE, -max, max, HITBOX.spikeCentre);
    }
    case 'loop-spike': {
      const out: TraceBox[] = [];
      for (let i = 0; i < trap.waypoints.length; i++) {
        const a = trap.waypoints[i] as { col: number; row: number };
        const b = trap.waypoints[(i + 1) % trap.waypoints.length] as { col: number; row: number };
        const [x0, y0] = centre(a.col, a.row);
        const [x1, y1] = centre(b.col, b.row);
        out.push(...sampleLine(x0, y0, x1, y1, HITBOX.spikeCentre));
      }
      return out;
    }
    case 'spike-wall': {
      // The one hazard still measured in whole tiles: `SpikeWallTrap` resizes
      // its own body as it extends, so its footprint IS the tiles it covers.
      const reach = trap.fromRight === true ? trap.col - trap.extendTiles : trap.col + trap.extendTiles;
      const topRow = trap.topRow ?? 0;
      const bottomRow = trap.bottomRow ?? topRow;
      return [
        {
          x: Math.min(trap.col, reach) * TILE_SIZE,
          y: topRow * TILE_SIZE,
          w: (Math.abs(reach - trap.col) + 1) * TILE_SIZE,
          h: (bottomRow + 1 - topRow) * TILE_SIZE,
        },
      ];
    }
    default:
      // Pads, belts, platforms, triggers, decoys and the pursuer: either
      // harmless, or (the pursuer) a thing that goes wherever the player
      // does, which makes "can it reach them" a question with one answer.
      return [];
  }
}

/** Ids of traps the proved route never brings the player's body into. */
export function trapsTheRouteNeverMeets(def: LevelDef): string[] {
  const boxes = routeBodyBoxes(def);
  if (boxes === null) return [];
  const out: string[] = [];
  for (const trap of def.traps ?? []) {
    const lethal = trapLethalBoxes(trap);
    if (lethal.length === 0) continue;
    const met = lethal.some((box) =>
      boxes.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h),
    );
    if (!met) out.push(trap.id);
  }
  return out;
}
