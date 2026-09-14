import type { LevelDef } from '@/gameplay/LevelDef';
import { TILE_SIZE } from '@/config/display';
import { MAX_JUMP_RISE_PX, REACH_AT_SAME_HEIGHT_PX } from '@/gameplay/jumpPhysics';
import { PLAYER_BODY_HEIGHT } from '@/config/physics';

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

/**
 * Idle → warning → active → cooldown for a one-shot ambush.
 *
 * `warningMs` was 500 and is 320. At 500 the thing had finished falling (or
 * finished rising out of the floor) a good 90ms before the player got
 * there, so what they met was a hazard already standing still and plainly
 * visible — "заранее видно шипы, которые вылезут снизу, слишком большое
 * окно для реакции, очень просто уклониться" (owner). At 320, paired with
 * the lead below, it becomes lethal in the frame they arrive.
 *
 * Still above `MIN_WARNING_MS` (250), and a spike bank spends most of 320ms
 * barely clearing the floor before it snaps (`SpikeBankTrap`'s Quint easing)
 * — so what is on screen is a floor that cracks and then hits, rather than
 * a set of spikes rising into view at reading speed.
 */
export const AMBUSH_TIMING = { idleMs: 900, warningMs: 320, activeMs: 300, cooldownMs: 250 } as const;

/**
 * Columns between an ambush trigger's left edge and its hazard.
 *
 * Three, not six, and it is `warningMs` written as distance: the trigger is
 * `lead × 10 + 5` px from the hazard's centre, which at `moveSpeed`
 * (110px/s) is 318ms of running — so a player who crosses the line and
 * keeps going arrives in the same frame the hazard turns lethal, with
 * nothing standing there waiting for them beforehand. It is also still just
 * over `MIN_REACTION_WINDOW_MS`, so stopping remains a real answer.
 */
export const AMBUSH_TRIGGER_LEAD = 3;

/**
 * Columns between a trapdoor's trigger and the pit: ONE — the last solid
 * tile before the edge.
 *
 * At four this was ~360ms of running with the hole already open ahead, and
 * the owner read that as the trap announcing itself from across the room:
 * "тригеры слишком далеко от ямы, слишком большое окно для реакции, должно
 * быть прям на краюшке". At one, the floor goes as the player's own foot
 * reaches the lip — about 90ms, which is under `MIN_REACTION_WINDOW_MS` and
 * is deliberately so. Recorded with the rest of his falling-floor decision
 * in CLAUDE.md #4.
 *
 * What still holds: the pit is never wider than a jump from its own edge
 * (checked in `tests/level-def-sanity.test.ts`), and `LevelValidator`
 * counts no trapdoor as a surface at all, so the level is passable with
 * every one of them already open. Being caught costs the attempt, never the
 * run.
 */
export const TRAPDOOR_LEAD = 1;

/**
 * THERE IS NO SEPARATE DROP TIMING ANY MORE, and the reason is worth
 * keeping.
 *
 * A `warningMs` of 560 lived here on the theory that a drop spike needs a
 * longer window than the rest: 250ms of telegraph plus 310ms of falling.
 * What it actually produced was a hazard that arrives after the player has
 * gone. Measured on a running player (`AMBUSH_TRIGGER_LEAD` is 318ms of
 * approach):
 *
 * - A spike bank crossed at 298ms after its trigger and only turned lethal
 *   at 567ms — 269ms of nothing, with the spikes still under the floor as
 *   the player ran over them ("шип который из земли вылазит вылазит слишком
 *   долго, успеваю пробежать" — owner).
 * - A drop spike was lethal on time, at 267ms, and irrelevant anyway: on
 *   `Cubic.easeIn` over 560ms it had covered 13% of its fall when the player
 *   passed underneath, hanging 92px over their head. Lethal and nowhere
 *   near them ("ловушка сверху падает слишком долго, я успеваю пробежать").
 *
 * Both are the same mistake — a window stretched past the approach it is
 * supposed to match — so both go back to the shared `AMBUSH_TIMING`, which
 * is written as the approach: at 320ms the bank snaps up into the player's
 * path as they arrive, and the spike is 82% of the way down and still
 * accelerating. The drop spike's own telegraph rule is unchanged and still
 * enforced by `AmbushSpikeTrap` (lethal only after `HANG_MS`, which at 320
 * is the first 48% of a visible, obviously-committed fall).
 */

/** How long a shifting pit takes to reach its new position — it has to finish before the player's take-off. */
export const PIT_SHIFT_MS = 420;

/**
 * How tall a trigger band has to be to catch a player who is JUMPING across
 * it rather than running through it.
 *
 * Three tiles was not enough and this was a real bug: the band reached 30px
 * above the floor, and a player at the top of a full jump has their
 * collision body between 34.7px and 46.7px up (`MAX_JUMP_RISE_PX` plus
 * `PLAYER_BODY_HEIGHT`). They passed clean over the switch — an overlap
 * zone is tested against the collision body, not the drawn android. The owner found it
 * from the other end — "триггеры на проваливающийся пол иногда не
 * срабатывают сразу, и я могу пробежать пол, и только потом он провалится":
 * the trap missing its cue on the jump, and then firing on some later pass
 * through the same columns.
 *
 * Derived rather than picked, so it cannot drift away from the jump it has
 * to cover if the physics are ever retuned.
 */
export const APPROACH_BAND_TILES = Math.ceil((MAX_JUMP_RISE_PX + PLAYER_BODY_HEIGHT) / TILE_SIZE);

/**
 * A trigger zone covering everywhere a player can be while crossing these
 * columns — on foot or in the air — ending at the surface they run along.
 *
 * Approaching from the left is the default (`width` columns ending where
 * the hazard is); `from: 'right'` mirrors it for a hazard approached the
 * other way.
 *
 * This band is sized for a jump launched from `surfaceRow` itself. A jump
 * launched from a nearby ELEVATED platform peaks higher still, which this
 * function has no way to know about — `widenForPlatforms` below is what
 * corrects for that, applied once per level after every trigger and every
 * platform both exist.
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
    row: surfaceRow - APPROACH_BAND_TILES,
    width: lead,
    height: APPROACH_BAND_TILES,
    targetId,
  };
}

/**
 * Raises a trigger's band to also cover the peak of a jump launched from any
 * PLATFORM whose reach overlaps the trigger's columns — not just a jump off
 * the ground surface the trigger was originally sized from.
 *
 * A real bug on PATROL: `dspike-01-trigger` sat under a ledge (`col: 26,
 * row: 19`), sized by `approach()` for a jump off the GROUND three rows
 * below. A jump launched from the ledge itself peaks three rows higher
 * still — so a player clearing the ledge stayed above the band for the
 * whole crossing and only dropped back into it at the hazard column,
 * meaning the trigger fired far too late or not at all: "могу перепрыгнуть
 * триггер второго шипа и он активизируется чуть позже" (owner). Measured
 * live crossing PATROL's own ledge: row ≈15.7-15.9 over the trigger's
 * columns, well above that trigger's un-widened ceiling of row 17.
 *
 * Applied once, automatically, to every level's triggers (`Level.ts`) —
 * not something a level author has to remember per hazard, because the
 * geometry that makes it necessary (a ledge near a sprung trap) is exactly
 * the kind of layout choice a level is designed around, not tuned against.
 * Only ever raises a band (lowers its `row`), never shrinks one.
 */
export function widenForPlatforms(
  trigger: Of<'trigger'>,
  platforms: ReadonlyArray<{ col: number; row: number; width: number }>,
): Of<'trigger'> {
  const jumpReachTiles = Math.ceil(REACH_AT_SAME_HEIGHT_PX / TILE_SIZE);
  const triggerFrom = trigger.col;
  const triggerTo = trigger.col + trigger.width - 1;
  const overlaps = (from: number, to: number): boolean => triggerFrom <= to && triggerTo >= from;

  let top = trigger.row;
  for (const platform of platforms) {
    const peakRow = platform.row - APPROACH_BAND_TILES;
    const reachesFromRight = overlaps(platform.col + platform.width, platform.col + platform.width + jumpReachTiles);
    const reachesFromLeft = overlaps(platform.col - jumpReachTiles, platform.col - 1);
    if (reachesFromRight || reachesFromLeft) top = Math.min(top, peakRow);
  }

  if (top === trigger.row) return trigger;
  return { ...trigger, row: top, height: trigger.row + trigger.height - top };
}

/**
 * A spike that falls out of nothing onto `landRow`, fired by walking into
 * the run-up. Invisible until it appears overhead, where it hangs in sight
 * for the telegraph and then falls — lethal from the first frame of the
 * fall (`AmbushSpikeTrap`, `AMBUSH_TIMING`).
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
