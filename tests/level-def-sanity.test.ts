import { describe, expect, it } from 'vitest';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import { SECTOR_04_LEVELS } from '@/data/levels/sector04';
import { SECTOR_05_LEVELS } from '@/data/levels/sector05';
import { LEVEL_HEIGHT_TILES, exitRowOf } from '@/gameplay/LevelDef';
import type { LevelDef } from '@/gameplay/LevelDef';
import { MAX_JUMP_RISE_PX, REACH_AT_SAME_HEIGHT_PX } from '@/gameplay/jumpPhysics';
import { LEVEL_WIDTH_TILES, TILE_SIZE } from '@/config/display';
import { PLAYER_HURT_BOX_HEIGHT } from '@/config/physics';
import { TRAPDOOR_LEAD } from '@/data/levels/ambush';

/**
 * Cheap structural sanity checks. This is not the reachability solver
 * (`LevelValidator.ts`, covered by tests/level-validator.test.ts) — it only
 * catches authoring mistakes that would make a level definition nonsensical
 * before physics ever runs.
 */
function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

describe.each([
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
])('level def: $id', (level: LevelDef) => {
  it('is exactly one screen wide', () => {
    // The camera does not scroll (`GameplayScene.setupCameras`) and its zoom
    // makes the visible world exactly `LEVEL_WIDTH_TILES` across on every
    // viewport. A narrower level would leave void past its edge; a wider one
    // would hide part of itself, which is the one thing the one-screen format
    // exists to prevent.
    expect(level.width).toBe(LEVEL_WIDTH_TILES);
  });

  it('has a ground row within the playfield', () => {
    expect(level.groundRow).toBeGreaterThan(0);
    expect(level.groundRow).toBeLessThan(LEVEL_HEIGHT_TILES);
  });

  it('has gap ranges that are valid and within bounds', () => {
    for (const [from, to] of level.gaps) {
      expect(from).toBeLessThanOrEqual(to);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThan(level.width);
    }
  });

  it('spawns the player on solid ground, not in a gap', () => {
    expect(level.playerStartCol).toBeGreaterThanOrEqual(0);
    expect(level.playerStartCol).toBeLessThan(level.width);
    expect(isInAnyGap(level.playerStartCol, level.gaps)).toBe(false);
  });

  it('places both exit columns on one real surface', () => {
    expect(level.exitCol).toBeGreaterThanOrEqual(0);
    expect(level.exitCol + 1).toBeLessThan(level.width);

    const exitRow = exitRowOf(level);
    if (exitRow === level.groundRow) {
      expect(isInAnyGap(level.exitCol, level.gaps)).toBe(false);
      expect(isInAnyGap(level.exitCol + 1, level.gaps)).toBe(false);
      return;
    }

    // An elevated exit needs a single platform under both of its columns —
    // one bridging two platforms with air under half of it is not somewhere
    // the player can stand.
    const carrier = level.platforms.find(
      (p) => p.row === exitRow && p.col <= level.exitCol && p.col + p.width - 1 >= level.exitCol + 1,
    );
    expect(carrier, `no platform at row ${exitRow} spans cols ${level.exitCol}-${level.exitCol + 1}`).toBeDefined();
  });

  it('never places a spike inside a gap', () => {
    for (const col of level.spikeColumns) {
      expect(isInAnyGap(col, level.gaps)).toBe(false);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(level.width);
    }
  });

  it('keeps platforms within the level bounds and above the ground', () => {
    for (const platform of level.platforms) {
      expect(platform.col).toBeGreaterThanOrEqual(0);
      expect(platform.col + platform.width).toBeLessThanOrEqual(level.width);
      expect(platform.row).toBeLessThan(level.groundRow);
      expect(platform.row).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps every trap inside the level bounds', () => {
    for (const trap of level.traps ?? []) {
      const cols =
        'col' in trap
          ? [trap.col]
          : 'fromCol' in trap
            ? [trap.fromCol, trap.toCol]
            : 'pivotCol' in trap
              ? [trap.pivotCol]
              : trap.waypoints.map((point) => point.col);
      for (const col of cols) {
        expect(col, `${trap.id} sits outside the level`).toBeGreaterThanOrEqual(0);
        expect(col, `${trap.id} sits outside the level`).toBeLessThan(level.width);
      }
    }
  });

  it('resolves every trigger targetId to a trap id defined in the same level', () => {
    const traps = level.traps ?? [];
    const ids = new Set(traps.map((t) => t.id));
    for (const trap of traps) {
      if (trap.type === 'trigger') {
        expect(ids.has(trap.targetId)).toBe(true);
      }
    }
  });

  it('gives every armed trapdoor a trigger, and puts that trigger ahead of it', () => {
    // The contract sector 01's `trapdoor()` helper encodes, asserted here so
    // it survives someone hand-writing one later: an armed floor that
    // nothing fires is simply floor, and a trigger *on* or *after* it fires
    // once the player has already crossed — the whole trap depends on the
    // warning arriving while they are still walking towards it.
    const traps = level.traps ?? [];
    const triggers = traps.filter((t): t is Extract<typeof t, { type: 'trigger' }> => t.type === 'trigger');
    for (const trap of traps) {
      if (trap.type !== 'falling-platform' || !trap.armed) continue;
      const trigger = triggers.find((t) => t.targetId === trap.id);
      expect(trigger, `${trap.id} is armed but nothing triggers it`).toBeDefined();
      expect(trigger!.col + trigger!.width, `${trap.id}'s trigger does not sit before it`).toBeLessThanOrEqual(trap.col);
    }
  });

  it('springs a trapdoor at the lip of its pit, and leaves a pit that can be jumped from that lip', () => {
    // WHAT IS LEFT OF THE TRAPDOOR CONTRACT, and it is deliberately less
    // than it was. This used to also require the run-up from trigger to pit
    // to exceed `MIN_REACTION_WINDOW_MS` — four columns, ~360ms — and the
    // owner asked for the opposite twice: no warning phase at all, and then
    // "тригеры слишком далеко от ямы, слишком большое окно для реакции,
    // должно быть прям на краюшке". `TRAPDOOR_LEAD` is one column now, so
    // the window is ~90ms and CLAUDE.md #4.5 does not hold for this trap.
    // That is recorded in CLAUDE.md #4 as his decision; the assertion is
    // dropped here rather than quietly loosened, so the file does not claim
    // to be checking something it is not.
    //
    // These two still hold, and they are what keep the level finishable:
    //
    // 1. The trigger sits AT the lip — exactly `TRAPDOOR_LEAD` columns back
    //    — so the floor goes in front of the player rather than under a
    //    player who has already gone past it, which was the other half of
    //    the same complaint ("иногда они срабатывают, когда я уже
    //    пробежал").
    // 2. The pit is jumpable from its own edge, which is also
    //    `LevelValidator`'s rule: the solver counts no armed trapdoor as a
    //    surface, so springing the trap costs an attempt rather than
    //    stranding anyone (CLAUDE.md #4.3/#4.4).
    const triggers = (level.traps ?? []).filter((t): t is Extract<typeof t, { type: 'trigger' }> => t.type === 'trigger');
    for (const trap of level.traps ?? []) {
      if (trap.type !== 'falling-platform' || !trap.armed) continue;
      const pit = (level.gaps ?? []).find(([from]) => from === trap.col);
      expect(pit, `${trap.id} does not cover a declared pit`).toBeDefined();
      const [from, to] = pit!;
      const trigger = triggers.find((t) => t.targetId === trap.id)!;
      expect(from - trigger.col, `${trap.id} does not spring at the lip of its pit`).toBe(TRAPDOOR_LEAD);
      expect((to - from + 1) * TILE_SIZE, `the pit under ${trap.id} cannot be jumped`).toBeLessThanOrEqual(
        REACH_AT_SAME_HEIGHT_PX,
      );
    }
  });

  it('has unique trap ids within the level', () => {
    const traps = level.traps ?? [];
    const ids = traps.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reaches every elevated platform/trap row from the ground via a chain of single-jump-height rises', () => {
    // A narrower, vertical-only complement to LevelValidator (which proves a
    // path from spawn to exit exists, but not that every individual platform
    // is reachable). This exists because of a real bug: an elevated bonus
    // route placed 4 tiles above ground turned out to be physically
    // unreachable — MAX_JUMP_RISE_PX caps a single jump's rise at ~34.7px,
    // and 4 tiles is 40px. Now that levels are one screen and built upward,
    // a mis-stacked tier is the most likely authoring mistake there is.
    const maxRiseTiles = MAX_JUMP_RISE_PX / TILE_SIZE;

    const rows = new Set<number>([level.groundRow, exitRowOf(level)]);
    for (const platform of level.platforms) rows.add(platform.row);
    for (const trap of level.traps ?? []) {
      if (trap.type === 'moving-platform') {
        rows.add(trap.fromRow);
        rows.add(trap.toRow);
      } else if (
        trap.type === 'falling-platform' ||
        trap.type === 'disappearing-platform' ||
        trap.type === 'fake-platform'
      ) {
        rows.add(trap.row);
      }
    }

    const reached = new Set<number>([level.groundRow]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (reached.has(row)) continue;
        for (const from of reached) {
          if (from - row <= maxRiseTiles) {
            reached.add(row);
            changed = true;
            break;
          }
        }
      }
    }

    const unreachable = [...rows].filter((r) => !reached.has(r));
    expect(unreachable, `rows unreachable from groundRow ${level.groundRow}: ${unreachable.join(', ')}`).toEqual([]);
  });
  it('never parks an always-lethal spike at chest height over a walkable surface', () => {
    // A `moving-spike` without `ambush` is lethal from the moment it
    // exists — no warning phase, the motion is the telegraph. So where it
    // sits relative to the floor underneath it decides what the player can
    // do about it, and there are only two honest answers:
    //
    //   - one row above the surface, standing on it: an obstacle to jump,
    //     which is what `PATROL` teaches in sector 01; or
    //   - clear of a standing player's hurt box entirely: scenery.
    //
    // In between is the case this test exists to forbid. `HUNTED` had one
    // three rows up, which is too high to be jumped comfortably and too low
    // to stand under — and because lethality was read off a box around the
    // player's shins it did nothing at all, passing visibly through the
    // android's chest (owner: "движущийся шип проходит прямо через меня, но
    // я живой"). With the hurt box covering the android, that placement is
    // a wall in the middle of a corridor, so it must not come back.
    const surfaceClearanceTiles = PLAYER_HURT_BOX_HEIGHT / TILE_SIZE;
    const offenders: string[] = [];
    const surfaces = [
      { row: level.groundRow, from: 0, to: level.width - 1 },
      ...level.platforms.map((p) => ({ row: p.row, from: p.col, to: p.col + p.width - 1 })),
    ];

    for (const trap of level.traps ?? []) {
      if (trap.type !== 'moving-spike' || trap.ambush) continue;
      const lowRow = Math.max(trap.fromRow, trap.toRow);
      const fromCol = Math.min(trap.fromCol, trap.toCol);
      const toCol = Math.max(trap.fromCol, trap.toCol);

      for (const surface of surfaces) {
        if (surface.row <= lowRow) continue;
        if (toCol < surface.from || fromCol > surface.to) continue;
        const gapTiles = surface.row - lowRow;
        if (gapTiles === 1) continue;
        if (gapTiles >= surfaceClearanceTiles + 1) continue;
        offenders.push(`${trap.id}: row ${lowRow} is ${gapTiles} tiles over a surface at row ${surface.row}`);
      }
    }

    expect(offenders, offenders.join('; ')).toEqual([]);
  });
  it('places every sprung trap somewhere the player can actually meet it', () => {
    // The campaign's surprise traps are all built from `ambush.ts`, and
    // their geometry is derived rather than eyeballed — but the columns
    // they are given still have to be real ground. This catches the
    // authoring mistakes that make an ambush silently do nothing, or do
    // something unanswerable:
    //
    //   - a bank rising out of a hole, or standing on the exit;
    //   - a spike landing in a pit, or on top of a static spike;
    //   - a trigger band that lies entirely inside a pit, so it only fires
    //     when a jump arc happens to clip it and never for a player who
    //     walks up and stops (AMBUSH's third spike was exactly this);
    //   - a trigger that reaches the spawn column, so it fires before the
    //     player has moved and the trap reads as random.
    const problems: string[] = [];
    const groundCols = (col: number): boolean => !isInAnyGap(col, level.gaps);
    const bandOnGround = (trap: { row: number; height: number }): boolean =>
      trap.row + trap.height - 1 === level.groundRow - 1;

    for (const trap of level.traps ?? []) {
      if (trap.type === 'spike-bank' && trap.lethalRow === level.groundRow - 1) {
        for (let i = 0; i < trap.width; i++) {
          const col = trap.col + i;
          if (!groundCols(col)) problems.push(`${trap.id}: rises out of the pit at column ${col}`);
          if (col === level.exitCol) problems.push(`${trap.id}: stands on the exit column`);
        }
      }

      if (trap.type === 'moving-spike' && trap.ambush) {
        if (trap.toRow === level.groundRow - 1 && !groundCols(trap.toCol)) {
          problems.push(`${trap.id}: lands in the pit at column ${trap.toCol}`);
        }
        if (trap.toCol === level.exitCol) problems.push(`${trap.id}: lands on the exit column`);
        if (level.spikeColumns.includes(trap.toCol)) {
          problems.push(`${trap.id}: lands on a static spike at column ${trap.toCol}`);
        }
      }

      if (trap.type === 'trigger') {
        const cols = Array.from({ length: trap.width }, (_, i) => trap.col + i);
        if (cols.some((col) => col < 0 || col >= level.width)) {
          problems.push(`${trap.id}: reaches off the level`);
        }
        if (!(level.traps ?? []).some((other) => other.id === trap.targetId)) {
          problems.push(`${trap.id}: targets ${trap.targetId}, which does not exist`);
        }
        if (bandOnGround(trap)) {
          if (cols.every((col) => !groundCols(col))) problems.push(`${trap.id}: lies entirely inside a pit`);
          if (cols.some((col) => col <= level.playerStartCol)) problems.push(`${trap.id}: reaches the spawn column`);
        }
      }
    }

    expect(problems, problems.join('; ')).toEqual([]);
  });

  it('gives every trap definition its own id', () => {
    const ids = (level.traps ?? []).map((trap) => trap.id);
    expect(ids, 'duplicate trap ids').toEqual([...new Set(ids)]);
  });
  it('keeps a ground-level trigger band out from under the ledges above it', () => {
    // A trigger band is tall — five tiles — because it has to catch a player
    // who JUMPS the columns it covers rather than running through them
    // (`APPROACH_BAND_TILES`; at three tiles they sailed clean over the
    // switch, which is the bug behind "триггеры на проваливающийся пол
    // иногда не срабатывают сразу").
    //
    // The cost of that height is this: a band standing on the ground now
    // reaches 50px up, and if a ledge happens to sit in that airspace, then
    // walking along the LEDGE fires the trap on the ground below — spending
    // a one-shot on nobody, which from the player's side is a trap that
    // simply did not work. Six of them were sitting like that.
    //
    // Only ground-level bands are checked. A band that belongs to a ledge
    // partway up a climb is placed by hand against that climb's own
    // geometry, and is allowed to reach the tier above it — that is often
    // the point.
    const problems: string[] = [];
    for (const trap of level.traps ?? []) {
      if (trap.type !== 'trigger') continue;
      if (trap.row + trap.height !== level.groundRow) continue;
      const bandCols = new Set(Array.from({ length: trap.width }, (_, i) => trap.col + i));
      const bandRows = new Set(Array.from({ length: trap.height }, (_, i) => trap.row + i));
      for (const platform of level.platforms) {
        const sharesColumn = Array.from({ length: platform.width }, (_, i) => platform.col + i).some((col) =>
          bandCols.has(col),
        );
        const holdsAStander = bandRows.has(platform.row - 1) || bandRows.has(platform.row - 2);
        if (sharesColumn && holdsAStander) {
          problems.push(`${trap.id} reaches into the platform at row ${platform.row}`);
        }
      }
    }
    expect(problems, problems.join('; ')).toEqual([]);
  });
});
