import { describe, expect, it } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import type { LevelDef } from '@/gameplay/LevelDef';
import type { TrapDef } from '@/traps/TrapDef';
import { DEFAULT_TRAP_TIMING } from '@/traps/TrapTiming';
import { launchDangerSec, usableLiftPx } from '@/gameplay/jumpPhysics';
import { TILE_SIZE } from '@/config/display';
import { MIN_REACTION_WINDOW_MS } from '@/config/physics';

/**
 * A LAUNCH CANNOT BE TAKEN BACK, so everything it flies through has to have
 * said so before it started.
 *
 * Sector 07 deliberately runs pads and hazards on different periods, which
 * means the relation between the two drifts and some launches are lethal.
 * That is honest only while the player, standing on the pad through its
 * warning phase, can SEE the hazard coming and step off. They keep
 * horizontal control in the air, so a hazard off to one side can still be
 * avoided by abandoning the crossing — but the HEIGHT is fixed the moment
 * the pad fires (`Player.launch` disables the jump cut on purpose), and
 * against something directly overhead refusing beforehand is the only
 * defence there is (CLAUDE.md #4.5).
 *
 * The first draft of that sector failed this on about one launch in twenty:
 * a bank whose telegraph began after the player had already been thrown.
 * Nothing on screen could have prevented that death, and no amount of play
 * would reliably have found it — the two clocks only line up that way every
 * few dozen cycles. So the rule is derived instead: a hazard standing over a
 * pad must warn for as long as the flight can keep the player inside it,
 * plus the reaction window.
 */

const REACTION_MS = MIN_REACTION_WINDOW_MS;

interface Hazard {
  id: string;
  fromCol: number;
  toCol: number;
  /** Largest row the hazard occupies — the lowest point of it on screen. */
  bottomRow: number;
  warningMs: number;
}

/** Timed, LETHAL hazards only: a `timing-gate` blocks and never kills, so a badly timed launch into one costs the climb, not the life. */
function hazardOf(trap: TrapDef): Hazard | null {
  const warningMs = (trap as { timing?: { warningMs: number } }).timing?.warningMs ?? DEFAULT_TRAP_TIMING.warningMs;
  switch (trap.type) {
    case 'laser':
      return { id: trap.id, fromCol: trap.col, toCol: trap.col, bottomRow: trap.bottomRow, warningMs };
    case 'spike-bank':
      return {
        id: trap.id,
        fromCol: trap.col,
        toCol: trap.col + trap.width - 1,
        bottomRow: Math.max(trap.hiddenRow, trap.lethalRow),
        warningMs,
      };
    case 'spike-wall': {
      const reach = trap.fromRight === true ? trap.col - trap.extendTiles : trap.col + trap.extendTiles;
      return {
        id: trap.id,
        fromCol: Math.min(trap.col, reach),
        toCol: Math.max(trap.col, reach),
        bottomRow: trap.bottomRow,
        warningMs,
      };
    }
    case 'electric-floor':
      return { id: trap.id, fromCol: trap.col, toCol: trap.col + trap.width - 1, bottomRow: trap.row, warningMs };
    default:
      return null;
  }
}

interface Pairing {
  level: string;
  pad: string;
  hazard: string;
  requiredMs: number;
  warningMs: number;
}

function pairingsOf(level: LevelDef): Pairing[] {
  const traps = level.traps ?? [];
  const hazards = traps.map(hazardOf).filter((h): h is Hazard => h !== null);
  const out: Pairing[] = [];

  for (const trap of traps) {
    // A `loop: false` pad fires once, on a trigger, and the solver already
    // refuses to count it as a way up — it is not a cycle the player reads.
    if (trap.type !== 'launch-pad' || trap.loop === false) continue;
    const liftPx = trap.liftTiles * TILE_SIZE;
    const lift = usableLiftPx(liftPx);
    // STRAIGHT UP, and only straight up. The player keeps full horizontal
    // control in the air, so a hazard off to one side can still be steered
    // around — at worst by not completing the crossing and coming back down
    // where they left. What cannot be answered is a hazard directly over the
    // pad: it is in the way of a launch the player has already been
    // committed to, and the only defence was refusing it.
    //
    // A wider, drift-sized corridor was tried first and it was wrong in a way
    // worth recording: it demanded a near-second telegraph from a beam in
    // sector 06 that merely stands on the ground beside a pad, where an
    // ordinary warning is exactly right and a long one would make the level
    // easier for no reason.
    const fromCol = trap.col;
    const toCol = trap.col + trap.width - 1;

    for (const hazard of hazards) {
      if (hazard.toCol < fromCol || hazard.fromCol > toCol) continue;
      const heightPx = (trap.row - hazard.bottomRow) * TILE_SIZE;
      // Below the pad, or higher than the throw reaches: not in the flight.
      if (heightPx <= 0 || heightPx > lift) continue;
      out.push({
        level: level.id,
        pad: trap.id,
        hazard: hazard.id,
        requiredMs: Math.ceil(launchDangerSec(liftPx, heightPx) * 1000) + REACTION_MS,
        warningMs: hazard.warningMs,
      });
    }
  }
  return out;
}

const pairings = getAllLevels().flatMap(pairingsOf);

describe('a hazard in a launch corridor telegraphs for longer than the flight', () => {
  it('finds the pad/hazard pairings to check', () => {
    // Sector 07 is built on them; if this ever drops to zero the rest of the
    // file is passing vacuously.
    expect(pairings.length).toBeGreaterThan(0);
    expect(pairings.some((p) => p.level.startsWith('sector-07'))).toBe(true);
  });

  it.each(pairings)(
    '$level: $hazard warns long enough for a player on $pad to refuse',
    ({ warningMs, requiredMs }) => {
      expect(warningMs).toBeGreaterThanOrEqual(requiredMs);
    },
  );
});
