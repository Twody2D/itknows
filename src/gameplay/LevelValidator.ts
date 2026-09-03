import { TILE_SIZE } from '@/config/display';
import type { LevelDef } from './LevelDef';
import { maxHorizontalReach } from './jumpPhysics';

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

function platformSegments(def: LevelDef): Segment[] {
  const segments = def.platforms.map((p, i) => ({
    label: `platform-${i}`,
    fromCol: p.col,
    toCol: p.col + p.width - 1,
    row: p.row,
  }));

  // Dynamic platform-family traps are approximated by the tile position
  // they're defined at (moving platforms: their start position). Exact
  // per-instant timing/position of dynamic traps is intentionally out of
  // scope here — see the module doc comment below.
  for (const trap of def.traps ?? []) {
    if (trap.type === 'moving-platform') {
      segments.push({
        label: `moving-platform-${trap.id}`,
        fromCol: trap.fromCol,
        toCol: trap.fromCol + trap.width - 1,
        row: trap.fromRow,
      });
    } else if (trap.type === 'disappearing-platform' || trap.type === 'falling-platform') {
      segments.push({
        label: `${trap.type}-${trap.id}`,
        fromCol: trap.col,
        toCol: trap.col + trap.width - 1,
        row: trap.row,
      });
    }
  }

  return segments;
}

function segmentContainsCol(segment: Segment, col: number): boolean {
  return col >= segment.fromCol && col <= segment.toCol;
}

function edgeGapPx(a: Segment, b: Segment): number | null {
  if (a.toCol < b.fromCol) return (b.fromCol - a.toCol - 1) * TILE_SIZE;
  if (b.toCol < a.fromCol) return (a.fromCol - b.toCol - 1) * TILE_SIZE;
  return null; // column ranges overlap — treat as directly reachable (e.g. a platform above ground)
}

function canJumpBetween(a: Segment, b: Segment): boolean {
  const gapPx = edgeGapPx(a, b);
  if (gapPx === null) return true;
  if (gapPx <= 0) return true;

  const aY = a.row * TILE_SIZE;
  const bY = b.row * TILE_SIZE;
  // a -> b: b's rise above a is (aY - bY); b -> a: a's rise above b is (bY - aY).
  const reachAtoB = maxHorizontalReach(aY - bY);
  const reachBtoA = maxHorizontalReach(bY - aY);
  return gapPx <= Math.max(reachAtoB, reachBtoA);
}

/**
 * Reachability solver over level geometry (CLAUDE.md #4.3 / master-prompt
 * §22). Builds one graph node per contiguous ground run and per platform
 * (including dynamic platform-family traps at their nominal position), and
 * connects any two nodes whose edge-to-edge gap is within
 * `maxHorizontalReach` of a full-held jump (`jumpPhysics.ts` — the same
 * constants the real Player controller uses). BFS from the spawn column to
 * the exit column proves the level is physically completable.
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
  const segments = [...groundSegments(def), ...platformSegments(def)];

  if (segments.length === 0) {
    return { valid: false, reason: 'no ground segments at all' };
  }

  const startSegment = segments.find((s) => segmentContainsCol(s, def.playerStartCol) && s.row === def.groundRow);
  if (!startSegment) {
    return { valid: false, reason: `player start column ${def.playerStartCol} is not on solid ground` };
  }

  const exitSegment = segments.find(
    (s) => s.row === def.groundRow && (segmentContainsCol(s, def.exitCol) || segmentContainsCol(s, def.exitCol + 1)),
  );
  if (!exitSegment) {
    return { valid: false, reason: `exit column ${def.exitCol} is not on solid ground` };
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
      if (canJumpBetween(current, other)) {
        visited.add(other);
        queue.push(other);
      }
    }
  }

  return { valid: false, reason: `no jump-reachable path from start to exit (checked ${segments.length} segments)` };
}
