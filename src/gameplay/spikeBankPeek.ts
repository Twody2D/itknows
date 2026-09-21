import { TILE_SIZE } from '@/config/display';
import type { LevelDef } from './LevelDef';

/**
 * Where a spike bank shows itself while it telegraphs — the rule, apart from
 * the thing that draws it.
 *
 * `traps/SpikeBankTrap.ts` needs Phaser, and a bank cannot work this out for
 * itself anyway: whether its resting position is visible at all depends on
 * which rows of the level are solid, which is level data. Same split
 * `gameplay/conveyor.ts` and `gameplay/jumpPhysics.ts` already use, and it
 * is what lets `tests/spike-bank-peek.test.ts` hold every bank in the
 * campaign to it without a browser.
 */

/**
 * How far past the surface a buried spike bank shows its tips while it
 * telegraphs, in px. Four of the eight drawn pixels of the tile — half the
 * spike, standing out of the floor, motionless.
 */
export const SPIKE_PEEK_PX = 4;

/**
 * Distance from a spike tile's centre to its leading ink edge, in px.
 *
 * `drawSpikeTile` fills triangles from the bottom of the 10x10 frame up to
 * `TILE_SIZE - 8`, so the ink occupies rows 2..10 and the tips sit 3 px above
 * the sprite's centre. A ceiling bank is flipped, which puts them 3 px below
 * it — same number, mirrored, which is why this is used as `dir * LEAD`.
 */
export const SPIKE_INK_LEAD = 3;

/**
 * Where a spike bank holds its tips during `warning` — see
 * `SpikeBankConfig.yPeek` for why this is not simply the resting position.
 *
 * A bank that rests in open air is readable where it rests, so it stays
 * there and the telegraph is the sprite appearing, motionless, for the whole
 * of `warningMs` — the same shape the drop spike was repaired into.
 *
 * A bank that rests behind solid geometry is not readable there at all. The
 * campaign's floor banks rest at `hiddenRow: groundRow + 1`, which puts
 * every drawn pixel of them 12 px under the floor line: the surface the
 * player is standing on never changes during the telegraph, and the first
 * thing to cross it is the lethal punch. For those the peek is the position
 * where the tips break that surface by `SPIKE_PEEK_PX`, clamped so the
 * telegraph can never reach the lethal position early.
 */
export function spikeBankPeekY(
  col: number,
  hiddenRow: number,
  lethalRow: number,
  groundRow: number,
  gaps: LevelDef['gaps'],
  platforms: LevelDef['platforms'],
): number {
  const yHidden = tileCentreY(hiddenRow);
  const dir = Math.sign(lethalRow - hiddenRow);
  if (dir === 0) return yHidden;

  const surfaceRow = hiddenRow + dir;
  const solid =
    (surfaceRow === groundRow && !isInAnyGap(col, gaps)) ||
    platforms.some((p) => p.row === surfaceRow && col >= p.col && col < p.col + p.width);
  if (!solid) return yHidden;

  // The plane the tips have to break: the top of that row going up, its
  // bottom going down.
  const plane = dir < 0 ? surfaceRow * TILE_SIZE : (surfaceRow + 1) * TILE_SIZE;
  const peek = plane + dir * (SPIKE_PEEK_PX - SPIKE_INK_LEAD);
  const yLethal = tileCentreY(lethalRow);
  return dir < 0 ? Math.max(peek, yLethal) : Math.min(peek, yLethal);
}

function isInAnyGap(col: number, gaps: LevelDef['gaps']): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

function tileCentreY(row: number): number {
  return row * TILE_SIZE + TILE_SIZE / 2;
}
