import Phaser from 'phaser';
import { drawPlayerFrame } from './drawPlayer';
import {
  drawExitTile,
  drawFakePlatformTile,
  drawGroundTile,
  drawMovingPlatformTile,
  drawPursuerIcon,
  drawSpikeTile,
} from './drawTiles';
import { PLAYER_FRAME_COUNTS, PLAYER_SPRITE_H, PLAYER_SPRITE_W } from './PLAYER_SPRITE';
import { PLAYER_ANIM_STATES } from '@/gameplay/PlayerAnimState';
import { TILE_SIZE } from '@/config/display';

const FRAME_RATE: Record<string, number> = {
  idle: 2,
  run: 10,
  jump: 1,
  fall: 1,
  land: 6,
  hurt: 1,
  death: 1,
  victory: 4,
};

const LOOPING = new Set(['idle', 'run', 'victory']);

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

function addOrReplaceCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export function generatePlayerTextures(scene: Phaser.Scene): void {
  for (const state of PLAYER_ANIM_STATES) {
    const frameCount = PLAYER_FRAME_COUNTS[state] ?? 1;
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];

    for (let f = 0; f < frameCount; f++) {
      const { canvas, ctx } = makeCanvas(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
      drawPlayerFrame(ctx, state, f);
      const key = `player-${state}-${f}`;
      addOrReplaceCanvas(scene, key, canvas);
      frames.push({ key, frame: 0 });
    }

    const animKey = `player-${state}`;
    if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
    scene.anims.create({
      key: animKey,
      frames,
      frameRate: FRAME_RATE[state] ?? 1,
      repeat: LOOPING.has(state) ? -1 : 0,
    });
  }
}

export function generateTileTextures(scene: Phaser.Scene): void {
  const ground = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundTile(ground.ctx);
  addOrReplaceCanvas(scene, 'tile-ground', ground.canvas);

  const spike = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawSpikeTile(spike.ctx);
  addOrReplaceCanvas(scene, 'tile-spike', spike.canvas);

  const exitW = TILE_SIZE * 2;
  const exitH = TILE_SIZE * 3;
  const exitActive = makeCanvas(exitW, exitH);
  drawExitTile(exitActive.ctx, exitW, exitH, true);
  addOrReplaceCanvas(scene, 'exit-active', exitActive.canvas);

  const exitInactive = makeCanvas(exitW, exitH);
  drawExitTile(exitInactive.ctx, exitW, exitH, false);
  addOrReplaceCanvas(scene, 'exit-inactive', exitInactive.canvas);

  const fakePlatform = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawFakePlatformTile(fakePlatform.ctx);
  addOrReplaceCanvas(scene, 'tile-fake-platform', fakePlatform.canvas);

  const movingPlatform = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawMovingPlatformTile(movingPlatform.ctx);
  addOrReplaceCanvas(scene, 'tile-moving-platform', movingPlatform.canvas);

  const pursuerSize = 8;
  const pursuer = makeCanvas(pursuerSize, pursuerSize);
  drawPursuerIcon(pursuer.ctx, pursuerSize);
  addOrReplaceCanvas(scene, 'trap-pursuer', pursuer.canvas);
}

export function generateAllTextures(scene: Phaser.Scene): void {
  generatePlayerTextures(scene);
  generateTileTextures(scene);
}
