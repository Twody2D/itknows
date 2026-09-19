import { describe, expect, it } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { LEVEL_HEIGHT_TILES, exitRowOf } from '@/gameplay/LevelDef';
import type { LevelDef } from '@/gameplay/LevelDef';
import { MAX_JUMP_RISE_PX, REACH_AT_SAME_HEIGHT_PX, usableLiftPx } from '@/gameplay/jumpPhysics';
import { LEVEL_WIDTH_TILES, TILE_SIZE } from '@/config/display';
import { MIN_WARNING_MS, PHYSICS, PLAYER_HURT_BOX_HEIGHT } from '@/config/physics';
import { DEFAULT_TRAP_TIMING } from '@/traps/TrapTiming';
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

/**
 * EVERY level the game can actually load, from the one registry that decides
 * that (`LevelFactory`) — not a hand-written list of sector imports.
 *
 * It was a hand-written list, and that was a hole rather than a style
 * choice: sector 06 was authored, registered in `LevelFactory`, shipped to
 * the level map, and ran the whole of this file's honesty checks against
 * nothing at all, because nobody had added a sixth import here. A test that
 * has to be told about new content is a test that stops covering the
 * content most likely to be wrong.
 */
describe.each([...getAllLevels()])('level def: $id', (level: LevelDef) => {
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
    // A launch pad is a surface too, and the rise it grants is the one thing
    // in the game that is not a jump — so it is both a row that has to be
    // reachable and a way of reaching others (sector 06 is built entirely of
    // tiers four and five tiles up, which no jump gains). The usable lift,
    // not the advertised one: `usableLiftPx` is what the body actually
    // delivers, and planning a level against the nominal number is the exact
    // mistake that would certify a climb the player cannot finish.
    const lifts: Array<{ row: number; riseTiles: number }> = [];
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
      } else if (trap.type === 'launch-pad') {
        rows.add(trap.row);
        // A pad that fires once on a trigger is not a way up — the same rule
        // `LevelValidator` applies, for the same reason: a route through a
        // launch that may never come is a dead end.
        if (trap.loop !== false) {
          lifts.push({ row: trap.row, riseTiles: usableLiftPx(trap.liftTiles * TILE_SIZE) / TILE_SIZE });
        }
      }
    }

    const reached = new Set<number>([level.groundRow]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (reached.has(row)) continue;
        for (const from of reached) {
          const byJump = from - row <= maxRiseTiles;
          const byLaunch = lifts.some((lift) => lift.row === from && from - row <= lift.riseTiles);
          if (byJump || byLaunch) {
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

  it('never hangs a fake platform over a hazard the player cannot read', () => {
    // WHAT KEEPS A FAKE PLATFORM HONEST, in its current form.
    //
    // Its tile is byte-identical to a real slab, by the owner's direct
    // instruction ("сделай тогда чтобы фантомные платформы выглядели точь в
    // точь как обычные... иначе смысла нет"), recorded in CLAUDE.md #4. The
    // player cannot tell one from the other until they are already falling
    // — so what has to be readable is not the tile, it is THE FLOOR
    // UNDERNEATH: the price of being wrong must be on screen before the
    // jump is taken.
    //
    // A STATIC SPIKE IS READABLE, and is therefore allowed here. It is
    // drawn from the first frame, never moves, never switches off, and the
    // owner asked for exactly this arrangement on GHOST FLOOR ("сделай
    // фальшивую лестницу с фальшивыми блоками... и сделать под ними шипы").
    // Before that request this test banned it outright, on the reasoning
    // that a decoy must only ever cost the climb. What replaces that
    // reasoning is narrower and survives it: a decoy may cost the attempt,
    // but only over a hazard the player was shown in advance.
    //
    // NOTHING ELSE IS. A pit under a decoy makes the decoy read as a bridge
    // over nothing; a spike bank is hidden below the floor until it fires;
    // an electric plate is invisible at idle (`ElectricFloorTrap`). In all
    // three the player has no way to price the fall, so those stay banned.
    const problems: string[] = [];
    const gaps = level.gaps ?? [];

    for (const trap of level.traps ?? []) {
      if (trap.type !== 'fake-platform') continue;
      for (let i = 0; i < trap.width; i++) {
        const col = trap.col + i;
        if (isInAnyGap(col, gaps)) problems.push(`${trap.id}: column ${col} is over a pit`);
        for (const other of level.traps ?? []) {
          if (other === trap) continue;
          const covers = (from: number, width: number): boolean => col >= from && col < from + width;
          if (other.type === 'spike-bank' && covers(other.col, other.width)) problems.push(`${trap.id}: column ${col} drops onto hidden ${other.id}`);
          if (other.type === 'electric-floor' && covers(other.col, other.width)) problems.push(`${trap.id}: column ${col} drops onto invisible ${other.id}`);
        }
      }
    }

    expect(problems, problems.join('; ')).toEqual([]);
  });

  it('gives a decoy over spikes a route that never needs it', () => {
    // The other half of the same bargain: falling onto spikes is only a
    // fair price for a gamble, and it is only a gamble if there is a way up
    // that asks nothing of the decoy. `LevelValidator` already proves every
    // level passable while treating fake platforms as thin air (that is
    // what makes the whole solver run meaningful), so what is checked here
    // is the thing the solver cannot see: that the spikes really are static
    // level geometry, drawn from frame one, and not something armed later.
    const spikes = new Set(level.spikeColumns ?? []);
    const decoyOverSpikes = (level.traps ?? []).filter(
      (trap) => trap.type === 'fake-platform' && Array.from({ length: trap.width }, (_, i) => trap.col + i).some((col) => spikes.has(col)),
    );
    for (const trap of decoyOverSpikes) {
      expect(trap.type).toBe('fake-platform');
      // Static spikes live in `spikeColumns`, which no trap can arm,
      // retract or hide — the check is that this is where they came from.
      expect(level.spikeColumns).toBeDefined();
    }
  });

  it('never parks two hazards on the same tiles', () => {
    // "Шипы друг на друга налазят" (owner, on PISTON ROW) — where a
    // triggered floor bank was authored across columns 31-33 while the
    // third piston already occupied 30-32. Two machines sharing tiles is
    // not extra difficulty: neither one can be read, one of them is spent
    // on a player who is already dead, and the trigger that fires the
    // second looks broken because its hazard is hidden inside the first.
    //
    // Overlap is only a fault when it happens in BOTH axes — a laser
    // crossing the rows above a patrol route is fine and common.
    type Box = { id: string; cols: [number, number]; rows: [number, number] };
    const boxes: Box[] = [];

    for (const trap of level.traps ?? []) {
      const span = (from: number, to: number): [number, number] => [Math.min(from, to), Math.max(from, to)];
      if (trap.type === 'spike-bank') {
        boxes.push({ id: trap.id, cols: [trap.col, trap.col + trap.width - 1], rows: span(trap.hiddenRow ?? trap.lethalRow ?? 0, trap.lethalRow ?? 0) });
      } else if (trap.type === 'moving-spike') {
        boxes.push({ id: trap.id, cols: span(trap.fromCol, trap.toCol), rows: span(trap.fromRow, trap.toRow) });
      } else if (trap.type === 'laser' || trap.type === 'timing-gate') {
        boxes.push({ id: trap.id, cols: [trap.col, trap.col], rows: span(trap.topRow, trap.bottomRow) });
      } else if (trap.type === 'electric-floor') {
        boxes.push({ id: trap.id, cols: [trap.col, trap.col + trap.width - 1], rows: [trap.row, trap.row] });
      }
    }

    const problems: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i] as Box;
        const b = boxes[j] as Box;
        const colsHit = a.cols[0] <= b.cols[1] && b.cols[0] <= a.cols[1];
        const rowsHit = a.rows[0] <= b.rows[1] && b.rows[0] <= a.rows[1];
        if (colsHit && rowsHit) {
          problems.push(`${a.id} (cols ${a.cols.join('-')}, rows ${a.rows.join('-')}) overlaps ${b.id} (cols ${b.cols.join('-')}, rows ${b.rows.join('-')})`);
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

/**
 * An ambush's warning must not outlast the run-up it is measured against.
 *
 * `AMBUSH_TRIGGER_LEAD` is `warningMs` written as distance: the trigger
 * stands that many columns before the hazard so a player who crosses it at
 * `moveSpeed` arrives in the frame the hazard turns lethal. Stretch
 * `warningMs` past that approach and the trap fires behind them.
 *
 * That is exactly what a 560ms window did. Measured live on a running
 * player: a spike bank on PATROL was crossed 298ms after its trigger and
 * only became lethal at 567ms, with the spikes still under the floor as he
 * ran over them; a drop spike on GRID CORE was lethal on time but had
 * covered 13% of its `Cubic.easeIn` fall by the time he passed, hanging
 * 92px above his head. Both read to the owner as the same thing — "вылазит
 * слишком долго, успеваю пробежать", "падает слишком долго, я успеваю
 * пробежать".
 *
 * So the window is bounded on both ends: never under `MIN_WARNING_MS`
 * (CLAUDE.md #4.2), never longer than the approach that is supposed to
 * deliver the player into it.
 */
describe('ambush timing matches the approach it is built on', () => {
  /**
   * Only hazards a trigger springs FROM THE RUN-UP — a band whose far edge
   * touches the hazard's own columns, which is the shape `approach()`
   * builds. Two other things are deliberately out of scope: a trap on a
   * clock (sector 03's pistons, the patrol spikes), which telegraphs by
   * repeating in plain sight and has no approach to match, and a trigger
   * placed away from its hazard on purpose — ASCENT drops a spike onto the
   * tile the next hop needs while the player watches from the tier below,
   * where the long warning is the point and nobody is running underneath.
   */
  const ambushes = getAllLevels().flatMap((level) => {
    const traps = level.traps ?? [];
    const columnsOf = (trap: (typeof traps)[number]): [number, number] | null => {
      if (trap.type === 'spike-bank') return [trap.col, trap.col + trap.width - 1];
      if (trap.type === 'moving-spike' && trap.ambush) return [trap.fromCol, trap.fromCol];
      return null;
    };
    return traps.flatMap((trap) => {
      const cols = columnsOf(trap);
      if (!cols) return [];
      const band = traps.find((t) => t.type === 'trigger' && t.targetId === trap.id);
      if (!band || band.type !== 'trigger') return [];
      const touchesFromLeft = band.col + band.width === cols[0];
      const touchesFromRight = band.col === cols[1] + 1;
      if (!touchesFromLeft && !touchesFromRight) return [];
      return [
        {
          level: level.id,
          id: trap.id,
          lead: band.width,
          warningMs: (trap as { timing?: { warningMs: number } }).timing?.warningMs ?? DEFAULT_TRAP_TIMING.warningMs,
        },
      ];
    });
  });

  it('finds the sprung hazards to check', () => {
    expect(ambushes.length).toBeGreaterThan(5);
    // PATROL's floor bank and BOOT's drop spike are the two the owner
    // reported running straight through; both must be in scope.
    expect(ambushes.some((a) => a.level === 'sector-01-level-03')).toBe(true);
    expect(ambushes.some((a) => a.level === 'sector-01-level-01')).toBe(true);
  });

  it.each(ambushes)('$level/$id is telegraphed, and lands while the player is still there', ({ lead, warningMs }) => {
    expect(warningMs).toBeGreaterThanOrEqual(MIN_WARNING_MS);
    const approachMs = ((lead * TILE_SIZE + TILE_SIZE / 2) / PHYSICS.moveSpeed) * 1000;
    // A few ms of slack for the rounding between "35px at 110px/s" and the
    // whole number a timing table actually carries.
    expect(warningMs).toBeLessThanOrEqual(Math.ceil(approachMs) + 5);
  });
});
