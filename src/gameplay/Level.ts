import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';
import type { LevelDef } from './LevelDef';
import { LEVEL_HEIGHT_TILES } from './LevelDef';
import type { TrapDef } from '@/traps/TrapDef';
import { LaserTrap } from '@/traps/LaserTrap';
import { MovingSpikeTrap } from '@/traps/MovingSpikeTrap';
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

export interface LethalHazard {
  gameObject: Phaser.GameObjects.GameObject;
  isLethal: () => boolean;
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

/**
 * Builds every trap def into a live instance. Runs in two passes because
 * `trigger` defs reference another trap's `id` — everything triggerable
 * must exist before triggers are wired to it.
 */
function buildTraps(scene: Phaser.Scene, defs: TrapDef[]): BuiltTraps {
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
        const from = tileCenter(def.fromCol, def.fromRow);
        const to = tileCenter(def.toCol, def.toRow);
        const trap = new MovingSpikeTrap(scene, { id: def.id, from, to, travelMs: def.travelMs });
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
        for (let i = 0; i < def.width; i++) {
          const { x, y } = tileCenter(def.col + i, def.row);
          const trap = new DisappearingPlatformTrap(scene, {
            id: `${def.id}-${i}`,
            x,
            y,
            crumbleMs: def.crumbleMs,
            goneMs: def.goneMs,
          });
          result.disappearingPlatforms.push(trap);
          result.updatable.push(trap);
          result.all.push(trap);
        }
        break;
      }

      case 'falling-platform': {
        for (let i = 0; i < def.width; i++) {
          const { x, y } = tileCenter(def.col + i, def.row);
          const trap = new FallingPlatformTrap(scene, {
            id: `${def.id}-${i}`,
            x,
            y,
            shakeMs: def.shakeMs,
            fallSpeed: def.fallSpeed,
            respawnMs: def.respawnMs,
          });
          result.fallingPlatforms.push(trap);
          result.updatable.push(trap);
          result.all.push(trap);
        }
        break;
      }

      case 'moving-platform': {
        const from = tileCenter(def.fromCol, def.fromRow);
        const to = tileCenter(def.toCol, def.toRow);
        const trap = new MovingPlatformTrap(scene, {
          id: def.id,
          from,
          to,
          travelMs: def.travelMs,
          widthPx: def.width * TILE_SIZE,
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
        result.lethalHazards.push({ gameObject: trap.hazard, isLethal: () => trap.isLethal() });
        result.all.push(trap);
        triggerable.set(def.id, trap);
        break;
      }

      case 'pursuer': {
        const { x, y } = tileCenter(def.col, def.row);
        const trap = new Pursuer(scene, { id: def.id, x, y, speedFactor: def.speedFactor });
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

  for (let col = 0; col < def.width; col++) {
    if (isInAnyGap(col, def.gaps)) continue;
    for (let row = def.groundRow; row < LEVEL_HEIGHT_TILES; row++) {
      const { x, y } = tileCenter(col, row);
      groundGroup.create(x, y, 'tile-ground');
    }
  }

  for (const col of def.spikeColumns) {
    if (isInAnyGap(col, def.gaps)) continue;
    const { x, y } = tileCenter(col, def.groundRow - 1);
    const spike = spikesGroup.create(x, y, 'tile-spike') as Phaser.Physics.Arcade.Sprite;
    const spikeBody = spike.body as Phaser.Physics.Arcade.StaticBody;
    // Forgiving hitbox — a few pixels smaller than the visible spike (CLAUDE.md #5).
    spikeBody.setSize(TILE_SIZE - 4, TILE_SIZE - 6);
    spikeBody.setOffset(2, 6);
    spike.refreshBody();
  }

  for (const platform of def.platforms) {
    for (let i = 0; i < platform.width; i++) {
      const { x, y } = tileCenter(platform.col + i, platform.row);
      platformsGroup.create(x, y, 'tile-ground');
    }
  }

  const exitWidth = 2 * TILE_SIZE;
  const exitHeight = 3 * TILE_SIZE;
  const exitX = def.exitCol * TILE_SIZE + exitWidth / 2;
  const exitY = def.groundRow * TILE_SIZE - exitHeight / 2;

  const exitSprite = scene.add.image(exitX, exitY, 'exit-active');
  const exitZone = scene.add.zone(exitX, exitY, exitWidth, exitHeight);
  scene.physics.add.existing(exitZone, true);

  const spawn = {
    x: def.playerStartCol * TILE_SIZE + TILE_SIZE / 2,
    y: def.groundRow * TILE_SIZE,
  };

  const traps = buildTraps(scene, def.traps ?? []);

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
