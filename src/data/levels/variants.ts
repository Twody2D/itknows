import type { LevelDef } from '@/gameplay/LevelDef';
import type { TrapDef } from '@/traps/TrapDef';
import { MIN_WARNING_MS } from '@/config/physics';
import { SECTOR_01_LEVELS } from './sector01';
import { SECTOR_02_LEVELS } from './sector02';
import { SECTOR_03_LEVELS } from './sector03';
import { SECTOR_04_LEVELS } from './sector04';
import { SECTOR_05_LEVELS } from './sector05';

const ALL = [
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
];

function base(id: string): LevelDef {
  const found = ALL.find((level) => level.id === id);
  if (!found) throw new Error(`variants.ts: unknown base level id "${id}"`);
  return found;
}

/**
 * Returns `level` with `edit` applied to the one trap whose id matches, and
 * every other trap untouched.
 *
 * All retuning goes through here on purpose. A variant may only change how a
 * hazard that is already on the level behaves — never add one, never take one
 * away, never move the geometry. That is what keeps `DifficultyDirector`
 * inside CLAUDE.md #6's promise ("персональнее, а не сложнее") and what makes
 * every variant automatically as solvable as its base: the reachability the
 * solver proved is a property of the geometry, and the geometry is shared.
 */
function retune(level: LevelDef, trapId: string, edit: Record<string, unknown>): LevelDef {
  const traps = (level.traps ?? []).map((trap) => (trap.id === trapId ? { ...trap, ...edit } : trap)) as TrapDef[];
  return { ...level, traps };
}

const PATROL = base('sector-01-level-03');
const SHIFT = base('sector-01-level-04');
const PENDULUM = base('sector-02-level-02');
const ORBIT = base('sector-02-level-03');
const BRIDGE = base('sector-02-level-05');
const BEAM = base('sector-03-level-01');
const PISTON_ROW = base('sector-03-level-04');
const SQUEEZE = base('sector-03-level-05');
const CIRCUIT = base('sector-04-level-03');
const HUNTED = base('sector-05-level-01');

/**
 * `DifficultyDirector`'s adaptive content: a gentler and a bolder cut of
 * eleven levels spread across all five sectors and every trap family the
 * campaign teaches, so a player who is struggling or thriving meets a real
 * difference rather than the same level again.
 *
 * `gentle` widens the window the player has to act in; `bold` narrows it, and
 * never below `MIN_WARNING_MS` — the honesty floor is not a difficulty
 * setting (CLAUDE.md #4.2). Neither ever changes what is on the level.
 *
 * `troll` is a separate axis (master-prompt §15): it does not change
 * difficulty, it subverts a habit the player's own profile shows they have
 * formed, and `selectVariant()` only reaches for it once neither struggling
 * nor thriving has already picked something. `DROP`'s is the example played
 * straight — see its comment below. It never adds danger, so it can only
 * ever be a redundant surprise, never an unfair one.
 */
export const LEVEL_VARIANTS: Record<string, { gentle?: LevelDef; bold?: LevelDef; troll?: LevelDef }> = {
  // DROP HAS NO VARIANTS, and that is the finding rather than an omission.
  //
  // It is four identical trapdoors, so the only property a variant could
  // reach is `holdMs` — how long a sprung floor stays put before it drops.
  // Tuning it up was reasoned to be "strictly safer" and therefore a fine
  // `gentle`, with a 1300ms `troll` on the first pit as the showcase for
  // subverting a learned habit. Both were wrong in the same way, and the
  // owner found it by playing: "триггеры на проваливающийся пол иногда не
  // срабатывают сразу, и я могу пробежать пол, и только потом он
  // провалится". Measured on the troll variant — the player crosses the pit
  // at columns 12-14 on floor that has not moved, keeps running to column
  // 25, and only there does it let go.
  //
  // That is the variant working exactly as written, and it is still a bug,
  // because a trap that visibly does not fire is indistinguishable from a
  // broken one. A variant may change how fast a hazard moves; it may not
  // change whether it happens. Every other entry in this file retunes
  // `travelMs`, `periodMs` or a phase timing — speeds of things that are on
  // screen doing something — which is the line this one crossed.
  [PATROL.id]: {
    gentle: retune(PATROL, 'mspike-01', { travelMs: 4000 }),
    bold: retune(PATROL, 'mspike-01', { travelMs: 2100 }),
  },
  [SHIFT.id]: {
    // How fast the hole in the floor walks. Slower is more time standing on
    // solid ground deciding; faster is the same decision, sooner.
    gentle: retune(SHIFT, 'movp-01', { travelMs: 4200 }),
    bold: retune(SHIFT, 'movp-01', { travelMs: 2200 }),
  },
  [PENDULUM.id]: {
    gentle: retune(PENDULUM, 'swing-02', { periodMs: 2400 }),
    bold: retune(PENDULUM, 'swing-02', { periodMs: 1250 }),
  },
  [ORBIT.id]: {
    // A slower sweep is a wider safe arc at the same radius — the jump is
    // unchanged, the moment to take it is longer.
    gentle: retune(ORBIT, 'orbit-02', { periodMs: 2800 }),
    bold: retune(ORBIT, 'orbit-02', { periodMs: 1400 }),
  },
  [BRIDGE.id]: {
    gentle: retune(BRIDGE, 'movp-01', { travelMs: 4200 }),
    bold: retune(BRIDGE, 'movp-01', { travelMs: 2600 }),
  },
  [BEAM.id]: {
    // More visible warning, less time actually lethal — same corridor, same
    // wait-then-go idea, a wider door.
    gentle: retune(BEAM, 'laser-01', { timing: { idleMs: 900, warningMs: 700, activeMs: 500, cooldownMs: 300 } }),
    bold: retune(BEAM, 'laser-01', {
      timing: { idleMs: 900, warningMs: MIN_WARNING_MS, activeMs: 900, cooldownMs: 300 },
    }),
  },
  [PISTON_ROW.id]: {
    gentle: retune(PISTON_ROW, 'sbank-02', {
      timing: { idleMs: 1200, warningMs: 700, activeMs: 300, cooldownMs: 400 },
    }),
    bold: retune(PISTON_ROW, 'sbank-02', {
      timing: { idleMs: 700, warningMs: MIN_WARNING_MS, activeMs: 500, cooldownMs: 200 },
    }),
  },
  [SQUEEZE.id]: {
    gentle: retune(SQUEEZE, 'swall-01', {
      timing: { idleMs: 1200, warningMs: 700, activeMs: 300, cooldownMs: 400 },
    }),
    bold: retune(SQUEEZE, 'swall-01', {
      timing: { idleMs: 800, warningMs: MIN_WARNING_MS, activeMs: 600, cooldownMs: 250 },
    }),
  },
  [CIRCUIT.id]: {
    gentle: retune(CIRCUIT, 'loop-01', { travelMs: 1400 }),
    bold: retune(CIRCUIT, 'loop-01', { travelMs: 900 }),
  },
  [HUNTED.id]: {
    // Never at or above 1: the pursuer is a clock, and a clock the player
    // cannot outrun would turn a level they can read into one they cannot
    // (CLAUDE.md #13).
    gentle: retune(HUNTED, 'pursuer-01', { speedFactor: 0.45 }),
    bold: retune(HUNTED, 'pursuer-01', { speedFactor: 0.75 }),
  },
};
