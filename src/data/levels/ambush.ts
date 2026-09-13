import type { LevelDef } from '@/gameplay/LevelDef';

type Trap = NonNullable<LevelDef['traps']>[number];
type Of<T extends Trap['type']> = Extract<Trap, { type: T }>;

/**
 * THE SPRUNG-TRAP VOCABULARY, in one place.
 *
 * Every level in the campaign is one screen the player can read before they
 * move, and for a long time that was all any of them asked: watch the
 * rhythm, walk through it, done first try. The owner played the whole thing
 * and said so — "нужно сделать так, чтобы пройти уровень с первого раза
 * было сложно, чтобы человек точно убился об ловушку, если не знал, что она
 * там есть и не уклонился" — and asked for the opposite habit: "хочу, чтобы
 * было больше внезапных ловушек по триггеру... чтобы игрок уворачивался от
 * всего и всегда был в напряжении".
 *
 * A sprung trap is not a dishonest one. What CLAUDE.md #4.2/#4.5 require is
 * that the LETHAL STATE is telegraphed for `MIN_WARNING_MS` and that the
 * player gets `MIN_REACTION_WINDOW_MS` to act — not that they were told the
 * trap existed. So these are surprises the first time and routine the
 * second, and dying to one always answers "yes" to the honesty question:
 * everything needed to survive it was on screen, in time.
 *
 * The whole contract lives in the two numbers below, and every helper here
 * derives its geometry from them rather than being placed by eye. A trigger
 * sits `*_LEAD` columns before its hazard because at `PHYSICS.moveSpeed`
 * (110px/s) that distance is the warning: cross the line at a run, and the
 * thing is lethal exactly as you arrive.
 */

/** Idle → warning → active → cooldown for a one-shot ambush. `warningMs` is double the honesty floor. */
export const AMBUSH_TIMING = { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 } as const;

/** Columns between an ambush trigger's left edge and its hazard — `moveSpeed × warningMs`, ≈55px. */
export const AMBUSH_TRIGGER_LEAD = 6;

/**
 * Columns between a trapdoor's trigger and the pit.
 *
 * This is the ONLY thing between the player and the hole now: the floor
 * used to flash and shake for 350ms before letting go, and the owner had
 * that removed (see `FallingPlatformTrap`). The pit therefore opens the
 * instant the line is crossed, four columns out — 40px, about 360ms of
 * run-up at `moveSpeed`, all of it with the hole already open and visible.
 * Shortening this would make the trap unreadable rather than merely
 * unannounced, so `tests/level-def-sanity.test.ts` holds it to
 * `MIN_REACTION_WINDOW_MS`.
 */
export const TRAPDOOR_LEAD = 4;

/** How long a shifting pit takes to reach its new position — it has to finish before the player's take-off. */
export const PIT_SHIFT_MS = 420;

/**
 * A trigger zone covering the band a player occupies while running along a
 * surface at `surfaceRow`: three rows tall, ending at the surface.
 *
 * Approaching from the left is the default (`width` columns ending where
 * the hazard is); `from: 'right'` mirrors it for a hazard approached the
 * other way.
 */
export function approach(
  id: string,
  targetId: string,
  hazardCol: number,
  surfaceRow: number,
  lead = AMBUSH_TRIGGER_LEAD,
  from: 'left' | 'right' = 'left',
): Of<'trigger'> {
  // `surfaceRow` is the floor the PLAYER is running along when they cross
  // the line, which is not always the floor the hazard sits on — a bank
  // rising out of a ledge overhead is armed from the ground below it.
  return {
    type: 'trigger',
    id,
    col: from === 'left' ? hazardCol - lead : hazardCol + 1,
    row: surfaceRow - 3,
    width: lead,
    height: 3,
    targetId,
  };
}

/**
 * A spike that falls out of nothing onto `landRow`, fired by walking into
 * the run-up. Invisible until it drops; the entire visible fall is the
 * warning and it can only kill once it has landed.
 */
export function dropSpike(
  id: string,
  col: number,
  landRow: number,
  surfaceRow: number,
  opts: { lead?: number; from?: 'left' | 'right'; activeMs?: number; fromRow?: number; triggerRow?: number } = {},
): [Of<'moving-spike'>, Of<'trigger'>] {
  return [
    {
      type: 'moving-spike',
      id,
      ambush: true,
      fromCol: col,
      fromRow: opts.fromRow ?? Math.max(landRow - 10, 1),
      toCol: col,
      toRow: landRow,
      timing: opts.activeMs ? { ...AMBUSH_TIMING, activeMs: opts.activeMs } : AMBUSH_TIMING,
      loop: false,
    },
    approach(`${id}-trigger`, id, col, opts.triggerRow ?? surfaceRow, opts.lead ?? AMBUSH_TRIGGER_LEAD, opts.from ?? 'left'),
  ];
}

/**
 * Spikes that punch up out of a floor the player is about to cross. The
 * bank is hidden at idle and rises over `warningMs`, most of it in the last
 * quarter (`SpikeBankTrap`) — so it reads as a snap, not a winch, and is
 * still visible for the full window before it can kill.
 */
export function floorSpikes(
  id: string,
  col: number,
  width: number,
  surfaceRow: number,
  opts: { lead?: number; from?: 'left' | 'right'; activeMs?: number; triggerRow?: number } = {},
): [Of<'spike-bank'>, Of<'trigger'>] {
  return [
    {
      type: 'spike-bank',
      id,
      col,
      width,
      // Out of sight below the floor, up to one row above it.
      hiddenRow: surfaceRow + 1,
      lethalRow: surfaceRow - 1,
      timing: opts.activeMs ? { ...AMBUSH_TIMING, activeMs: opts.activeMs } : AMBUSH_TIMING,
      loop: false,
    },
    approach(`${id}-trigger`, id, col, opts.triggerRow ?? surfaceRow, opts.lead ?? AMBUSH_TRIGGER_LEAD, opts.from ?? 'left'),
  ];
}

/**
 * One trapdoor: the armed floor plus the trigger that springs it, always
 * built together so the contract cannot drift apart in an edit. `col`/
 * `width` describe the floor; the pit underneath is declared in the level's
 * own `gaps`, because that is geometry the solver reads.
 */
export function trapdoor(
  id: string,
  col: number,
  width: number,
  row = 22,
): [Of<'falling-platform'>, Of<'trigger'>] {
  return [
    { type: 'falling-platform', id, col, row, width, armed: true },
    approach(`${id}-trigger`, id, col, row, TRAPDOOR_LEAD),
  ];
}

/**
 * THE HOLE THAT MOVES UNDER YOUR LANDING. A slab of floor covering `from`
 * slides to `to` the moment the player crosses the run-up, which drags the
 * gap it leaves behind straight into the spot a jump lined up on the
 * original hole would have landed.
 *
 * `lead` defaults to eight columns — 73ms per column at `moveSpeed`, so the
 * slab has finished its `PIT_SHIFT_MS` trip with a stride to spare while
 * the player is still on their feet, take-off ahead of them. That is the
 * whole honesty argument: the hole is somewhere new, in plain sight, before
 * anything is committed. `LevelValidator` only ever counts the slab at
 * `to`, so the level is proved passable in the state the trap leaves it in.
 */
export function shiftingPit(
  id: string,
  fromCol: number,
  toCol: number,
  width: number,
  row = 22,
  opts: { lead?: number } = {},
): [Of<'moving-platform'>, Of<'trigger'>] {
  const lead = opts.lead ?? 8;
  return [
    {
      type: 'moving-platform',
      id,
      fromCol,
      fromRow: row,
      toCol,
      toRow: row,
      width,
      travelMs: PIT_SHIFT_MS,
      armed: true,
    },
    approach(`${id}-trigger`, id, Math.min(fromCol, toCol), row, lead),
  ];
}
