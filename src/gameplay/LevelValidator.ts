import { TILE_SIZE } from '@/config/display';
import type { LevelDef } from './LevelDef';
import { exitRowOf } from './LevelDef';
import { MAX_JUMP_RISE_PX, maxHorizontalReach } from './jumpPhysics';

interface Segment {
  label: string;
  fromCol: number;
  toCol: number;
  row: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

/** Ground, split into contiguous runs by the level's gaps. */
function groundSegments(def: LevelDef): Segment[] {
  const segments: Segment[] = [];
  let runStart: number | null = null;

  for (let col = 0; col <= def.width; col++) {
    const blocked = col === def.width || isInAnyGap(col, def.gaps);
    if (!blocked && runStart === null) {
      runStart = col;
    } else if (blocked && runStart !== null) {
      segments.push({ label: `ground[${runStart}-${col - 1}]`, fromCol: runStart, toCol: col - 1, row: def.groundRow });
      runStart = null;
    }
  }

  return segments;
}

/**
 * Every standable surface, plus the "ride" edges a moving platform adds.
 *
 * A moving platform is two places, not one: where it starts and where it
 * ends. Modelling it only at its start position (what this used to do) is
 * wrong in the direction that matters — a bridge across a pit wider than a
 * jump would be reported unsolvable even though riding it is the intended
 * and only solution, which is precisely what a bridge is for. Both
 * endpoints become nodes and the ride between them becomes an edge in both
 * directions, since the platform comes back.
 *
 * The other platform-family traps stay single nodes at their nominal
 * position; per-instant timing (is the disappearing platform there *now*)
 * is out of scope here, see the module doc comment below.
 */
function platformSegments(def: LevelDef): { segments: Segment[]; rides: Array<[Segment, Segment]> } {
  const segments: Segment[] = def.platforms.map((p, i) => ({
    label: `platform-${i}`,
    fromCol: p.col,
    toCol: p.col + p.width - 1,
    row: p.row,
  }));
  const rides: Array<[Segment, Segment]> = [];

  for (const trap of def.traps ?? []) {
    if (trap.type === 'moving-platform') {
      const start: Segment = {
        label: `moving-platform-${trap.id}@start`,
        fromCol: trap.fromCol,
        toCol: trap.fromCol + trap.width - 1,
        row: trap.fromRow,
      };
      const end: Segment = {
        label: `moving-platform-${trap.id}@end`,
        fromCol: trap.toCol,
        toCol: trap.toCol + trap.width - 1,
        row: trap.toRow,
      };
      segments.push(start, end);
      rides.push([start, end]);
    } else if (trap.type === 'disappearing-platform' || trap.type === 'falling-platform') {
      segments.push({
        label: `${trap.type}-${trap.id}`,
        fromCol: trap.col,
        toCol: trap.col + trap.width - 1,
        row: trap.row,
      });
    }
  }

  return { segments, rides };
}

function segmentContainsCol(segment: Segment, col: number): boolean {
  return col >= segment.fromCol && col <= segment.toCol;
}

/** Horizontal px between the two segments' nearest edges; 0 when their column ranges overlap. */
function edgeGapPx(a: Segment, b: Segment): number {
  if (a.toCol < b.fromCol) return (b.fromCol - a.toCol - 1) * TILE_SIZE;
  if (b.toCol < a.fromCol) return (a.fromCol - b.toCol - 1) * TILE_SIZE;
  return 0;
}

/**
 * Can the player get from standing on `from` to standing on `to`, in that
 * direction, with one jump?
 *
 * DIRECTED ON PURPOSE. Dropping ten tiles down is free; climbing ten tiles
 * back up is impossible, and the two are not the same edge. This used to
 * connect a pair whenever *either* direction worked and to treat any two
 * segments whose columns overlapped as mutually reachable regardless of
 * height — which is harmless for a flat corridor (the shape every level had
 * when it was written) and completely wrong for a climb, where it would
 * happily certify a level whose exit platform sits ten tiles above anything
 * the player can reach. Since levels are now one screen and built upward
 * (`LevelDef`), that is the normal case, not an edge case.
 */
function canReach(from: Segment, to: Segment): boolean {
  const fromY = from.row * TILE_SIZE;
  const toY = to.row * TILE_SIZE;
  // Positive when `to` sits above `from` — the height the jump has to gain.
  const rise = fromY - toY;
  if (rise > MAX_JUMP_RISE_PX) return false;
  return edgeGapPx(from, to) <= maxHorizontalReach(rise);
}

/**
 * Reachability solver over level geometry (CLAUDE.md #4.3 / master-prompt
 * §22). Builds one graph node per contiguous ground run and per platform
 * (including dynamic platform-family traps at their nominal position), and
 * connects node A to node B when a single full-held jump from A both gains
 * B's height and covers the horizontal gap (`jumpPhysics.ts` — the same
 * constants the real Player controller uses). Edges are directed, so a
 * one-way drop is never mistaken for a way back up. BFS from the spawn
 * column to the exit proves the level is physically completable.
 *
 * Scope: this validates STATIC geometry — a jump-reachable path exists.
 * It does not simulate trap timing (whether a laser's active window can be
 * dodged mid-crossing, whether a moving platform is at the right spot at
 * the right instant). That's asserted separately, per trap, via the fixed
 * honesty invariants in `traps/TrapTiming.ts` (minimum warning duration)
 * and by design discipline (CLAUDE.md #4 — no mandatory dynamic-trap-timed
 * jump without a slower, verifiable alternative route). A level failing
 * this check is unconditionally invalid; a level passing it still needs the
 * trap placements themselves to be honest by construction.
 */
export function validateLevel(def: LevelDef): ValidationResult {
  const { segments: platforms, rides } = platformSegments(def);
  const segments = [...groundSegments(def), ...platforms];

  /** Segments reachable from `segment` by riding a moving platform it is standing on. */
  const ridesFrom = (segment: Segment): Segment[] =>
    rides.flatMap(([a, b]) => (a === segment ? [b] : b === segment ? [a] : []));

  if (segments.length === 0) {
    return { valid: false, reason: 'no ground segments at all' };
  }

  const startSegment = segments.find((s) => segmentContainsCol(s, def.playerStartCol) && s.row === def.groundRow);
  if (!startSegment) {
    return { valid: false, reason: `player start column ${def.playerStartCol} is not on solid ground` };
  }

  // The exit may stand on any real surface, not just the ground row — an
  // exit on the top tier is what turns a one-screen level into a climb
  // (`LevelDef.exitRow`). Both of its columns must sit on the *same*
  // segment: an exit bridging two platforms with a gap under its right half
  // is not something the player can stand in.
  const exitRow = exitRowOf(def);
  const exitSegment = segments.find(
    (s) => s.row === exitRow && segmentContainsCol(s, def.exitCol) && segmentContainsCol(s, def.exitCol + 1),
  );
  if (!exitSegment) {
    return { valid: false, reason: `exit columns ${def.exitCol}-${def.exitCol + 1} do not sit on one surface at row ${exitRow}` };
  }

  const visited = new Set<Segment>([startSegment]);
  const queue: Segment[] = [startSegment];

  while (queue.length > 0) {
    const current = queue.shift() as Segment;
    if (current === exitSegment) {
      return { valid: true };
    }
    for (const other of segments) {
      if (visited.has(other)) continue;
      if (canReach(current, other)) {
        visited.add(other);
        queue.push(other);
      }
    }
    for (const other of ridesFrom(current)) {
      if (visited.has(other)) continue;
      visited.add(other);
      queue.push(other);
    }
  }

  return { valid: false, reason: `no jump-reachable path from start to exit (checked ${segments.length} segments)` };
}
