import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';
import type { LevelDef } from './LevelDef';
import { LEVEL_HEIGHT_TILES } from './LevelDef';

export interface BuiltLevel {
  groundGroup: Phaser.Physics.Arcade.StaticGroup;
  spikesGroup: Phaser.Physics.Arcade.StaticGroup;
  platformsGroup: Phaser.Physics.Arcade.StaticGroup;
  exitZone: Phaser.GameObjects.Zone;
  exitSprite: Phaser.GameObjects.Image;
  spawn: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
}

function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
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
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      groundGroup.create(x, y, 'tile-ground');
    }
  }

  for (const col of def.spikeColumns) {
    if (isInAnyGap(col, def.gaps)) continue;
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = (def.groundRow - 1) * TILE_SIZE + TILE_SIZE / 2;
    const spike = spikesGroup.create(x, y, 'tile-spike') as Phaser.Physics.Arcade.Sprite;
    const spikeBody = spike.body as Phaser.Physics.Arcade.StaticBody;
    // Forgiving hitbox — a few pixels smaller than the visible spike (CLAUDE.md #5).
    spikeBody.setSize(TILE_SIZE - 4, TILE_SIZE - 6);
    spikeBody.setOffset(2, 6);
    spike.refreshBody();
  }

  for (const platform of def.platforms) {
    for (let i = 0; i < platform.width; i++) {
      const x = (platform.col + i) * TILE_SIZE + TILE_SIZE / 2;
      const y = platform.row * TILE_SIZE + TILE_SIZE / 2;
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

  return {
    groundGroup,
    spikesGroup,
    platformsGroup,
    exitZone,
    exitSprite,
    spawn,
    worldWidth,
    worldHeight,
  };
}
