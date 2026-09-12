import Phaser from 'phaser';
import { SIDE_WALL_PX, TILE_SIZE } from '@/config/display';
import {
  SPIKE_HITBOX_WIDTH,
  SPIKE_HITBOX_HEIGHT,
  SPIKE_HITBOX_OFFSET_X,
  SPIKE_HITBOX_OFFSET_Y,
} from '@/config/physics';
import type { LevelDef } from './LevelDef';
import { LEVEL_HEIGHT_TILES, exitRowOf } from './LevelDef';
import type { TrapDef } from '@/traps/TrapDef';
import { LaserTrap } from '@/traps/LaserTrap';
import { MovingSpikeTrap } from '@/traps/MovingSpikeTrap';
import { AmbushSpikeTrap } from '@/traps/AmbushSpikeTrap';
import { FakePlatformTrap } from '@/traps/FakePlatformTrap';
import { DisappearingPlatformTrap } from '@/traps/DisappearingPlatformTrap';
import { FallingPlatformTrap } from '@/traps/FallingPlatformTrap';
import { MovingPlatformTrap } from '@/traps/MovingPlatformTrap';
import { ElectricFloorTrap } from '@/traps/ElectricFloorTrap';
import { TriggerTrap } from '@/traps/TriggerTrap';
import type { Triggerable } from '@/traps/TriggerTrap';
import { Pursuer } from '@/traps/Pursuer';
import { TimingGate } from '@/traps/TimingGate';
import { FakeExit } from '@/traps/FakeExit';
import { SpikeBankTrap } from '@/traps/SpikeBankTrap';
import { SpikeWallTrap } from '@/traps/SpikeWallTrap';
import { OrbitSpikeTrap } from '@/traps/OrbitSpikeTrap';
import { SwingingSpikeTrap } from '@/traps/SwingingSpikeTrap';
import { LoopSpikeTrap } from '@/traps/LoopSpikeTrap';
import { hash01, stringHash } from '@/art/hash';
import { PALETTE } from '@/config/palette';

export interface LethalHazard {
  id: string;
  gameObject: Phaser.GameObjects.GameObject;
  isLethal: () => boolean;
  /** The object that actually renders the hazard, for FX (warning-pulse) — defaults to `gameObject` when the physics body itself is visible. Electric floor's `gameObject` is an invisible overlap zone; its visible surface is a separate sprite. */
  visual?: Phaser.GameObjects.GameObject & { alpha: number };
}

export interface UpdatableTrap {
  update: (time: number, delta: number) => void;
}

export interface BuiltTraps {
  /** Every trap that needs a per-frame tick (excludes pursuers — the scene ticks them with the player's x). */
  updatable: UpdatableTrap[];
  lethalHazards: LethalHazard[];
  disappearingPlatforms: DisappearingPlatformTrap[];
  fallingPlatforms: FallingPlatformTrap[];
  movingPlatforms: MovingPlatformTrap[];
  timingGates: TimingGate[];
  triggers: TriggerTrap[];
  pursuers: Pursuer[];
  fakeExits: FakeExit[];
  all: Array<{ destroy: () => void }>;
}

export interface BuiltLevel {
  groundGroup: Phaser.Physics.Arcade.StaticGroup;
  spikesGroup: Phaser.Physics.Arcade.StaticGroup;
  platformsGroup: Phaser.Physics.Arcade.StaticGroup;
  exitZone: Phaser.GameObjects.Zone;
  exitSprite: Phaser.GameObjects.Image;
  spawn: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
  traps: BuiltTraps;
}

function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

/** Contiguous `[fromCol, toCol]` runs of solid ground, split by the level's gaps. */
function groundRuns(def: LevelDef): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start: number | null = null;

  for (let col = 0; col <= def.width; col++) {
    const blocked = col === def.width || isInAnyGap(col, def.gaps);
    if (!blocked && start === null) {
      start = col;
    } else if (blocked && start !== null) {
      runs.push([start, col - 1]);
      start = null;
    }
  }

  return runs;
}

/**
 * Picks a ground-top texture key per column from a level-seeded hash instead
 * of `col % N` — panel seams and lights land at irregular positions so a run
 * of tiles reads as variable-width panels, not one unit repeated (art-
 * direction reset, gameplay-screen pass). Deterministic: same level, same
 * column, same key, every run (CLAUDE.md #4.6's reproducibility discipline).
 */
function groundTopKey(levelSeed: number, col: number): string {
  const seamRoll = hash01(levelSeed + col * 7919);
  const seam = seamRoll < 0.3 ? 0 : seamRoll < 0.55 ? 1 : seamRoll < 0.8 ? 2 : 3;
  const damageRoll = hash01(levelSeed + col * 5303 + 1);
  if (damageRoll < 0.05) return 'tile-ground-damaged';
  const lightRoll = hash01(levelSeed + col * 2609 + 2);
  return lightRoll < 0.12 ? `tile-ground-top-s${seam}-light` : `tile-ground-top-s${seam}`;
}

/**
 * Builds every trap def into a live instance. Runs in two passes because
 * `trigger` defs reference another trap's `id` — everything triggerable
 * must exist before triggers are wired to it.
 */
function buildTraps(scene: Phaser.Scene, defs: TrapDef[], levelSeed: number, groundRow: number): BuiltTraps {
  const result: BuiltTraps = {
    updatable: [],
    lethalHazards: [],
    disappearingPlatforms: [],
    fallingPlatforms: [],
    movingPlatforms: [],
    timingGates: [],
    triggers: [],
    pursuers: [],
    fakeExits: [],
    all: [],
  };

  const triggerable = new Map<string, Triggerable>();
  const triggerDefs: Extract<TrapDef, { type: 'trigger' }>[] = [];

  for (const def of defs) {
    switch (def.type) {
      case 'trigger':
        triggerDefs.push(def);
        continue;

      case 'moving-spike': {
        if (def.ambush) {
          const { x } = tileCenter(def.fromCol, def.fromRow);
          const trap = new AmbushSpikeTrap(scene, {
            id: def.id,
            x,
            yHidden: tileCenter(def.fromCol, def.fromRow).y,
            yLanded: tileCenter(def.fromCol, def.toRow).y,
            timing: def.timing,
            initialIdleMs: def.initialIdleMs,
            loop: def.loop,
          });
          result.updatable.push(trap);
          result.lethalHazards.push(trap);
          result.all.push(trap);
          triggerable.set(def.id, trap);
          break;
        }
        const from = tileCenter(def.fromCol, def.fromRow);
        const to = tileCenter(def.toCol, def.toRow);
        // `travelMs` is only optional in `TrapDef` to accommodate `ambush`
        // mode (handled above) — every non-ambush level def supplies it.
        const trap = new MovingSpikeTrap(scene, { id: def.id, from, to, travelMs: def.travelMs ?? 0 });
        result.lethalHazards.push(trap);
        result.all.push(trap);
        break;
      }

      case 'laser': {
        const { x } = tileCenter(def.col, def.topRow);
        const trap = new LaserTrap(scene, {
          id: def.id,
          x,
          yTop: def.topRow * TILE_SIZE,
          yBottom: (def.bottomRow + 1) * TILE_SIZE,
          timing: def.timing,
          initialIdleMs: def.initialIdleMs,
          loop: def.loop,
        });
        result.updatable.push(trap);
        result.lethalHazards.push(trap);
        result.all.push(trap);
        triggerable.set(def.id, trap);
        break;
      }

      case 'fake-platform': {
        for (let i = 0; i < def.width; i++) {
          const { x, y } = tileCenter(def.col + i, def.row);
          const trap = new FakePlatformTrap(scene, { id: `${def.id}-${i}`, x, y });
          result.all.push(trap);
        }
        break;
      }

      case 'disappearing-platform': {
        const ledge: DisappearingPlatformTrap[] = [];
        for (let i = 0; i < def.width; i++) {
          const { x, y } = tileCenter(def.col + i, def.row);
          const trap = new DisappearingPlatformTrap(scene, {
            id: `${def.id}-${i}`,
            x,
            y,
            crumbleMs: def.crumbleMs,
            goneMs: def.goneMs,
          });
          ledge.push(trap);
          result.disappearingPlatforms.push(trap);
          result.updatable.push(trap);
          result.all.push(trap);
        }
        // THE LEDGE CRUMBLES AS ONE, like the trapdoor span below. Each
        // tile used to keep its own timer, so a three-wide ledge was three
        // independent floors: land on the first, walk to the second while
        // it flickers, and the crumble delay was effectively tripled. That
        // is not a ledge giving way, it is a conveyor — and it is a good
        // part of why CRUMBLE could be walked up ("слишком лёгкий и
        // проходится очень просто" — owner). Standing anywhere on it now
        // starts the whole thing going.
        for (const tile of ledge) tile.linkSpan(ledge);
        break;
      }

      case 'falling-platform': {
        const span: FallingPlatformTrap[] = [];
        for (let i = 0; i < def.width; i++) {
          const { x, y } = tileCenter(def.col + i, def.row);
          const trap = new FallingPlatformTrap(scene, {
            id: `${def.id}-${i}`,
            x,
            y,
            holdMs: def.holdMs,
            fallSpeed: def.fallSpeed,
            armed: def.armed,
            warnMs: def.warnMs,
            // The tile the ground on either side would have used at this
            // column, so the trapdoor is not a different-looking patch of
            // floor (owner: "сделай, чтобы яма, которая разрушается, не
            // отличалась по внешнему виду с обычной землёй").
            texture: groundTopKey(levelSeed, def.col + i),
            asFloor: def.row === groundRow,
            // A trapdoor in the ground row brings its own sub-surface rock:
            // the runs either side stop at its columns, so without this the
            // level draws a black shaft under a floor that still reads as
            // solid — the tell the owner spotted straight away ("ловушки
            // всё равно видно").
            shaftDepthPx:
              def.armed && def.row === groundRow
                ? (LEVEL_HEIGHT_TILES - groundRow - 1) * TILE_SIZE
                : undefined,
          });
          span.push(trap);
          result.fallingPlatforms.push(trap);
          result.updatable.push(trap);
          result.all.push(trap);
        }
        // The def is one trapdoor; the tiles are how it is built. A trigger
        // naming this def's id springs the whole span at once, so the floor
        // goes as one piece rather than one column at a time.
        triggerable.set(def.id, { trigger: () => span.forEach((tile) => tile.trigger()) });
        break;
      }

      case 'moving-platform': {
        // `fromCol` is the slab's LEFT edge — the same reading
        // `LevelValidator` uses when it treats the slab as spanning
        // `fromCol .. fromCol + width - 1`. It used to be centred on that
        // one tile instead, so a fourteen-column slab reached seven
        // columns back past its own start and sat on top of the ground
        // beside the pit: the owner's "блоки друг на друге" on SHIFT was
        // literally a slab overlapping the floor, and every wide platform
        // in the campaign was drawn half a slab left of where the solver
        // believed it was.
        const widthPx = def.width * TILE_SIZE;
        const leftEdgeOffset = widthPx / 2 - TILE_SIZE / 2;
        const fromCentre = tileCenter(def.fromCol, def.fromRow);
        const toCentre = tileCenter(def.toCol, def.toRow);
        const trap = new MovingPlatformTrap(scene, {
          id: def.id,
          from: { x: fromCentre.x + leftEdgeOffset, y: fromCentre.y },
          to: { x: toCentre.x + leftEdgeOffset, y: toCentre.y },
          travelMs: def.travelMs,
          widthPx,
          // A slab riding along the ground row is not a platform the player
          // boards, it is the floor with a hole walking through it — so it
          // is drawn as floor, with the same bright lip every run of ground
          // carries. Anywhere else it stays a mechanical slab.
          asFloor: def.fromRow === groundRow && def.toRow === groundRow,
        });
        result.movingPlatforms.push(trap);
        result.all.push(trap);
        break;
      }

      case 'electric-floor': {
        const x = def.col * TILE_SIZE + (def.width * TILE_SIZE) / 2;
        const y = def.row * TILE_SIZE + TILE_SIZE / 2;
        const trap = new ElectricFloorTrap(scene, { id: def.id, x, y, widthTiles: def.width, timing: def.timing });
        result.updatable.push(trap);
        result.lethalHazards.push({
          id: trap.id,
          gameObject: trap.hazard,
          isLethal: () => trap.isLethal(),
          visual: trap.support,
        });
        result.all.push(trap);
        triggerable.set(def.id, trap);
        break;
      }

      case 'pursuer': {
        const { x, y } = tileCenter(def.col, def.row);
        const trap = new Pursuer(scene, {
          id: def.id,
          x,
          y,
          speedFactor: def.speedFactor,
          startDelayMs: def.startDelayMs,
        });
        result.pursuers.push(trap);
        result.lethalHazards.push(trap);
        result.all.push(trap);
        break;
      }

      case 'timing-gate': {
        const { x } = tileCenter(def.col, def.topRow);
        const trap = new TimingGate(scene, {
          id: def.id,
          x,
          yTop: def.topRow * TILE_SIZE,
          yBottom: (def.bottomRow + 1) * TILE_SIZE,
          timing: def.timing,
        });
        result.timingGates.push(trap);
        result.updatable.push(trap);
        result.all.push(trap);
        triggerable.set(def.id, trap);
        break;
      }

      case 'fake-exit': {
        const x = def.col * TILE_SIZE + TILE_SIZE;
        const y = def.row * TILE_SIZE - (3 * TILE_SIZE) / 2;
        const trap = new FakeExit(scene, { id: def.id, x, y });
        result.fakeExits.push(trap);
        result.all.push(trap);
        break;
      }

      case 'spike-bank': {
        const bank: SpikeBankTrap[] = [];
        for (let i = 0; i < def.width; i++) {
          const { x } = tileCenter(def.col + i, def.lethalRow);
          const trap = new SpikeBankTrap(scene, {
            id: `${def.id}-${i}`,
            x,
            yHidden: tileCenter(def.col + i, def.hiddenRow).y,
            yLethal: tileCenter(def.col + i, def.lethalRow).y,
            timing: def.timing,
            initialIdleMs: def.initialIdleMs,
            loop: def.loop,
          });
          bank.push(trap);
          result.updatable.push(trap);
          result.lethalHazards.push(trap);
          result.all.push(trap);
        }
        // Same shape as the trapdoor above: the def is one bank, the tiles
        // are how it is built, and a trigger naming the def fires the whole
        // span together (`loop: false` turns it into a one-shot ambush that
        // springs where the player walks rather than on a clock).
        triggerable.set(def.id, { trigger: () => bank.forEach((spike) => spike.trigger()) });
        break;
      }

      case 'spike-wall': {
        const { x } = tileCenter(def.col, def.topRow);
        // `tileCenter` centers on the column; the retracted edge sits at
        // that tile's near side, so the wall never reaches back past its
        // own starting tile.
        const edgeX = def.fromRight ? x + TILE_SIZE / 2 : x - TILE_SIZE / 2;
        const yTop = def.topRow * TILE_SIZE;
        const yBottom = (def.bottomRow + 1) * TILE_SIZE;
        const trap = new SpikeWallTrap(scene, {
          id: def.id,
          edgeX,
          y: yTop + (yBottom - yTop) / 2,
          height: yBottom - yTop,
          extendedWidth: def.extendTiles * TILE_SIZE,
          fromRight: def.fromRight,
          timing: def.timing,
          initialIdleMs: def.initialIdleMs,
          loop: def.loop,
        });
        result.updatable.push(trap);
        result.lethalHazards.push(trap);
        result.all.push(trap);
        triggerable.set(def.id, trap);
        break;
      }

      case 'orbit-spike': {
        const { x, y } = tileCenter(def.pivotCol, def.pivotRow);
        const trap = new OrbitSpikeTrap(scene, {
          id: def.id,
          pivotX: x,
          pivotY: y,
          radius: def.radiusTiles * TILE_SIZE,
          periodMs: def.periodMs,
          clockwise: def.clockwise,
        });
        result.lethalHazards.push(trap);
        result.all.push(trap);
        break;
      }

      case 'swinging-spike': {
        const { x, y } = tileCenter(def.pivotCol, def.pivotRow);
        const trap = new SwingingSpikeTrap(scene, {
          id: def.id,
          pivotX: x,
          pivotY: y,
          length: def.lengthTiles * TILE_SIZE,
          maxAngleDeg: def.maxAngleDeg,
          periodMs: def.periodMs,
        });
        result.lethalHazards.push(trap);
        result.all.push(trap);
        break;
      }

      case 'loop-spike': {
        const trap = new LoopSpikeTrap(scene, {
          id: def.id,
          waypoints: def.waypoints.map((wp) => tileCenter(wp.col, wp.row)),
          travelMs: def.travelMs,
        });
        result.lethalHazards.push(trap);
        result.all.push(trap);
        break;
      }
    }
  }

  for (const def of triggerDefs) {
    const target = triggerable.get(def.targetId);
    if (!target) {
      throw new Error(`trigger ${def.id}: unknown targetId "${def.targetId}"`);
    }
    const x = def.col * TILE_SIZE + (def.width * TILE_SIZE) / 2;
    const y = def.row * TILE_SIZE + (def.height * TILE_SIZE) / 2;
    const trap = new TriggerTrap(scene, {
      id: def.id,
      x,
      y,
      width: def.width * TILE_SIZE,
      height: def.height * TILE_SIZE,
      target,
    });
    result.triggers.push(trap);
    result.all.push(trap);
  }

  return result;
}

export function buildLevel(scene: Phaser.Scene, def: LevelDef): BuiltLevel {
  const groundGroup = scene.physics.add.staticGroup();
  const spikesGroup = scene.physics.add.staticGroup();
  const platformsGroup = scene.physics.add.staticGroup();

  const worldWidth = def.width * TILE_SIZE;
  const worldHeight = LEVEL_HEIGHT_TILES * TILE_SIZE;

  const levelSeed = stringHash(def.id);

  // Side walls. The level is exactly the narrowest viewport wide, so every
  // wider screen has spare width either side of it; this fills that width
  // with solid rock instead of void, full height, drawn over whatever the
  // background layers do or don't reach. Decoration only — the player is
  // stopped at the level's real edge by the physics world bounds
  // (`GameplayScene`), and the wall is what makes stopping there read as a
  // wall rather than as an invisible barrier.
  for (const wallLeft of [-SIDE_WALL_PX, worldWidth]) {
    // `tile-ground-fill` alone is sub-surface rock and reads as pure black
    // against the void (checked live) — it needs a ground to sit on and an
    // edge to end at. The rim is the same 2px cyan the ground runs use for
    // their own top surface, so a wall face says "solid" in exactly the
    // vocabulary the rest of the level already speaks.
    scene.add.rectangle(wallLeft, 0, SIDE_WALL_PX, worldHeight, PALETTE.bgIndigo, 1).setOrigin(0, 0).setDepth(-6);
    scene.add.tileSprite(wallLeft, 0, SIDE_WALL_PX, worldHeight, 'tile-ground-fill').setOrigin(0, 0).setDepth(-5);
    const innerEdge = wallLeft < 0 ? 0 : worldWidth;
    scene.add.rectangle(innerEdge, 0, 2, worldHeight, PALETTE.cyan, 0.85).setOrigin(0.5, 0).setDepth(-4);
  }

  // Ground is built per contiguous run, not per column. Every tile in a run
  // shares one surface row, so the run's collision is a single body and its
  // sub-surface fill a single tiled sprite. Both matter now that levels are
  // hundreds of tiles wide:
  //
  // 1. Physics honesty. Side-by-side or stacked static bodies snag Arcade
  //    Physics' corner resolution — a player sliding down a pit wall can get
  //    a false `touching.down` on a seam and climb out or chain air-jumps.
  //    A run with no internal seams cannot produce one.
  // 2. Cost. A 260-tile level would otherwise mean ~260 static bodies and
  //    ~1300 images; this is a handful of bodies plus one fill sprite per
  //    run (the surface row stays per-column, for its texture variety).
  // Columns a trapdoor is currently covering. The pit under one is real
  // geometry (the solver reads it, and it is what the player falls into),
  // but until the trap springs there is floor over it — so it must not get
  // the drop-off treatment that marks a genuine edge.
  const coveredCols = new Set<number>();
  for (const trap of def.traps ?? []) {
    if (trap.type !== 'falling-platform' || !trap.armed) continue;
    for (let i = 0; i < trap.width; i++) coveredCols.add(trap.col + i);
  }
  const isOpenGap = (col: number): boolean => isInAnyGap(col, def.gaps) && !coveredCols.has(col);

  const fillRows = LEVEL_HEIGHT_TILES - def.groundRow - 1;
  for (const [fromCol, toCol] of groundRuns(def)) {
    for (let col = fromCol; col <= toCol; col++) {
      // The warm drop-off sliver marks the lip of a hole. Next to a
      // trapdoor there is no hole yet, and painting one there told the
      // player exactly where the floor was about to leave (owner: "яма,
      // которая разрушается, не должна отличаться по внешнему виду с
      // обычной землёй").
      const isGapEdge = isOpenGap(col - 1) || isOpenGap(col + 1);
      const { x, y } = tileCenter(col, def.groundRow);
      scene.add.image(x, y, isGapEdge ? 'tile-ground-edge' : groundTopKey(levelSeed, col));
    }

    const runWidth = (toCol - fromCol + 1) * TILE_SIZE;
    const runLeft = fromCol * TILE_SIZE;
    const surfaceTop = def.groundRow * TILE_SIZE;

    if (fillRows > 0) {
      scene.add
        .tileSprite(runLeft, surfaceTop + TILE_SIZE, runWidth, fillRows * TILE_SIZE, 'tile-ground-fill')
        .setOrigin(0, 0);
    }

    // One bright rim spanning the whole run, on top of the per-column seam
    // lines — a run of ground has to read as a single big "safe to stand"
    // platform from a distance, not a dotted line you only see up close
    // (VISUAL RESET v1 #8).
    scene.add.rectangle(runLeft + runWidth / 2, surfaceTop, runWidth, 2, PALETTE.cyan, 0.85).setOrigin(0.5, 0);

    const runHeight = (LEVEL_HEIGHT_TILES - def.groundRow) * TILE_SIZE;
    const collider = scene.add.rectangle(runLeft + runWidth / 2, surfaceTop + runHeight / 2, runWidth, runHeight, 0, 0);
    scene.physics.add.existing(collider, true);
    groundGroup.add(collider);
  }

  for (const col of def.spikeColumns) {
    if (isInAnyGap(col, def.gaps)) continue;
    const { x, y } = tileCenter(col, def.groundRow - 1);
    const spike = spikesGroup.create(x, y, 'tile-spike') as Phaser.Physics.Arcade.Sprite;
    const spikeBody = spike.body as Phaser.Physics.Arcade.StaticBody;
    // Forgiving hitbox — well smaller than the visible spike (CLAUDE.md #5, `config/physics.ts`).
    //
    // Real bug, found live: `refreshBody()` (`StaticBody.updateFromGameObject()`
    // under the hood) re-derives the static body's size/offset from the
    // sprite's texture frame every time it's called — calling it AFTER
    // `setSize`/`setOffset` silently threw both away back to the full 10x10
    // tile, every spike, in every level, since this code was first written.
    // The forgiving hitbox never actually applied at runtime; only the full
    // rectangular tile did. No `refreshBody()` call is needed here at all —
    // it exists to reposition a body after moving its sprite post-creation,
    // and this sprite is already created at its final x/y.
    spikeBody.setSize(SPIKE_HITBOX_WIDTH, SPIKE_HITBOX_HEIGHT);
    spikeBody.setOffset(SPIKE_HITBOX_OFFSET_X, SPIKE_HITBOX_OFFSET_Y);
  }

  for (const platform of def.platforms) {
    for (let i = 0; i < platform.width; i++) {
      const { x, y } = tileCenter(platform.col + i, platform.row);
      const bolt = hash01(levelSeed + (platform.col + i) * 4111 + 3) < 0.3;
      platformsGroup.create(x, y, bolt ? 'tile-platform-slab-bolt' : 'tile-platform-slab');
    }
  }

  // Physics zone stays at the original 2x3-tile footprint (`LevelValidator`
  // checks exactly `exitCol`/`exitCol+1` sit on one surface) — only the
  // sprite drawn on top of it is bigger, bottom-anchored to the same
  // surface line, the same way the player's sprite overflows its own hitbox.
  // The surface is the ground row by default and a platform row when the
  // level puts its exit up a tier (`LevelDef.exitRow`).
  const exitSurfaceY = exitRowOf(def) * TILE_SIZE;
  const exitWidth = 2 * TILE_SIZE;
  const exitHeight = 3 * TILE_SIZE;
  const exitX = def.exitCol * TILE_SIZE + exitWidth / 2;
  const exitY = exitSurfaceY - exitHeight / 2;

  // Bottom-anchored to the surface line, and animated with light rather than
  // geometry.
  //
  // This used to be centre-anchored with a `scale: 1 -> 1.04` tween, which on
  // a 50px pixel-art sprite under `roundPixels` is a 2px change snapping
  // between integers — so the door visibly jittered, and because it grew from
  // its centre, its bottom edge sank a pixel into the floor and came back out
  // every cycle. That is the "portal moves strangely" the owner spotted.
  // Pulsing the glow says the same thing ("this is alive, come here") without
  // moving a single pixel — the same treatment the menu's PLAY tile uses.
  const exitSprite = scene.add.image(exitX, exitSurfaceY, 'exit-active').setOrigin(0.5, 1);
  const exitGlow = exitSprite.postFX.addGlow(PALETTE.cyan, 1, 0, false, 0.3, 6);
  scene.tweens.add({
    targets: exitGlow,
    outerStrength: { from: 1, to: 4 },
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const exitZone = scene.add.zone(exitX, exitY, exitWidth, exitHeight);
  scene.physics.add.existing(exitZone, true);

  const spawn = {
    x: def.playerStartCol * TILE_SIZE + TILE_SIZE / 2,
    y: def.groundRow * TILE_SIZE,
  };

  const traps = buildTraps(scene, def.traps ?? [], levelSeed, def.groundRow);

  return {
    groundGroup,
    spikesGroup,
    platformsGroup,
    exitZone,
    exitSprite,
    spawn,
    worldWidth,
    worldHeight,
    traps,
  };
}
