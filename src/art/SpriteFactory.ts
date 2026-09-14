import Phaser from 'phaser';
import { drawPlayerFrame } from './drawPlayer';
import { SKIN_VISUALS, playerTexturePrefix, skinColorsFor } from '@/data/shop/skinVisuals';
import {
  drawExitTile,
  drawGroundEdge,
  drawGroundFill,
  drawGroundTop,
  drawMovingPlatformTile,
  drawPlatformSlab,
  drawPursuerIcon,
  drawSpikeTile,
  EXIT_VISUAL_HEIGHT_TILES,
  EXIT_VISUAL_WIDTH_TILES,
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
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function addOrReplaceCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/**
 * `skinId: 'default'` (the only value every existing caller passes, via the
 * omitted default) keeps today's exact unprefixed keys (`player-idle-0`,
 * anim `player-idle`) — every existing reference (`Player.ts`'s hardcoded
 * initial texture, `MainMenuScene`'s preview sprite) stays untouched. Any
 * other skin id gets its own prefixed key set instead, generated once per
 * catalog skin at boot (`BootScene`) — see `skinColorsFor`.
 */
export function generatePlayerTextures(scene: Phaser.Scene, skinId = 'default'): void {
  const prefix = playerTexturePrefix(skinId);
  const colors = skinColorsFor(skinId);

  for (const state of PLAYER_ANIM_STATES) {
    const frameCount = PLAYER_FRAME_COUNTS[state] ?? 1;
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];

    for (let f = 0; f < frameCount; f++) {
      const { canvas, ctx } = makeCanvas(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
      drawPlayerFrame(ctx, state, f, colors);
      const key = `${prefix}-${state}-${f}`;
      addOrReplaceCanvas(scene, key, canvas);
      frames.push({ key, frame: 0 });
    }

    const animKey = `${prefix}-${state}`;
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
  // 'tile-ground' stays as the default top-edge look — dynamic platform
  // traps (falling/disappearing/electric-floor) key off it directly.
  const groundTop = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundTop(groundTop.ctx, false);
  addOrReplaceCanvas(scene, 'tile-ground-top', groundTop.canvas);

  const groundTopLight = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundTop(groundTopLight.ctx, true);
  addOrReplaceCanvas(scene, 'tile-ground-top-light', groundTopLight.canvas);

  const groundEdgeRight = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundEdge(groundEdgeRight.ctx, 'right');
  addOrReplaceCanvas(scene, 'tile-ground-edge-right', groundEdgeRight.canvas);

  const groundEdgeLeft = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundEdge(groundEdgeLeft.ctx, 'left');
  addOrReplaceCanvas(scene, 'tile-ground-edge-left', groundEdgeLeft.canvas);

  const groundFill = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawGroundFill(groundFill.ctx);
  addOrReplaceCanvas(scene, 'tile-ground-fill', groundFill.canvas);

  const platformSlab = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawPlatformSlab(platformSlab.ctx, false);
  addOrReplaceCanvas(scene, 'tile-platform-slab', platformSlab.canvas);

  const platformSlabBolt = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawPlatformSlab(platformSlabBolt.ctx, true);
  addOrReplaceCanvas(scene, 'tile-platform-slab-bolt', platformSlabBolt.canvas);


  const spike = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawSpikeTile(spike.ctx);
  addOrReplaceCanvas(scene, 'tile-spike', spike.canvas);

  const exitW = Math.round(TILE_SIZE * EXIT_VISUAL_WIDTH_TILES);
  const exitH = Math.round(TILE_SIZE * EXIT_VISUAL_HEIGHT_TILES);
  const exitActive = makeCanvas(exitW, exitH);
  drawExitTile(exitActive.ctx, exitW, exitH, true);
  addOrReplaceCanvas(scene, 'exit-active', exitActive.canvas);

  const exitInactive = makeCanvas(exitW, exitH);
  drawExitTile(exitInactive.ctx, exitW, exitH, false);
  addOrReplaceCanvas(scene, 'exit-inactive', exitInactive.canvas);

  const movingPlatform = makeCanvas(TILE_SIZE, TILE_SIZE);
  drawMovingPlatformTile(movingPlatform.ctx);
  addOrReplaceCanvas(scene, 'tile-moving-platform', movingPlatform.canvas);

  const pursuerSize = 8;
  const pursuer = makeCanvas(pursuerSize, pursuerSize);
  drawPursuerIcon(pursuer.ctx, pursuerSize);
  addOrReplaceCanvas(scene, 'trap-pursuer', pursuer.canvas);
}

/** Every purchasable skin gets its texture/anim set generated once at boot — a small fixed cost (a handful of skins × ~11 already-cheap canvas draws), never a runtime one (CLAUDE.md #9). */
const CATALOG_SKIN_IDS = ['default', ...Object.keys(SKIN_VISUALS)];

export function generateAllTextures(scene: Phaser.Scene): void {
  for (const skinId of CATALOG_SKIN_IDS) generatePlayerTextures(scene, skinId);
  generateTileTextures(scene);
}
