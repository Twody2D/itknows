import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import type { PlayerAnimState } from '@/gameplay/PlayerAnimState';
import { PLAYER_SPRITE_H, PLAYER_SPRITE_W } from './PLAYER_SPRITE';

/**
 * A small asymmetric drone-android, not a stack of centered rectangles: a
 * narrow head sits on a wider torso (a real shoulder-line silhouette), the
 * single visor-lens sits left-of-center, the antenna and the side data-port
 * sit on the right — the shape reads correctly even in flat silhouette,
 * without relying on the visor to sell "this is a character" (art-direction
 * reset, CLAUDE.md #3 — primitives only, no raster art).
 */
export function drawPlayerFrame(ctx: CanvasRenderingContext2D, state: PlayerAnimState, frame: number): void {
  ctx.clearRect(0, 0, PLAYER_SPRITE_W, PLAYER_SPRITE_H);

  const bodyColor: number = state === 'hurt' ? PALETTE.danger : PALETTE.white;
  let visorColor: number = PALETTE.cyan;
  if (state === 'hurt' || state === 'death') visorColor = PALETTE.danger;
  if (state === 'victory') visorColor = PALETTE.reward;

  let squash = 0;
  let legSpread = 0;
  let bob = 0;
  let visorWidth = 2;
  let showPort = true;

  switch (state) {
    case 'idle':
      bob = frame === 1 ? 1 : 0;
      break;
    case 'run':
      legSpread = frame % 2 === 0 ? 2 : -2;
      bob = frame % 2 === 0 ? 0 : 1;
      break;
    case 'jump':
      squash = -1;
      visorWidth = 3;
      break;
    case 'fall':
      legSpread = 1;
      visorWidth = 1;
      break;
    case 'land':
      squash = 2;
      legSpread = 3;
      break;
    case 'hurt':
      visorWidth = 1;
      showPort = false;
      break;
    case 'death':
      visorWidth = 0;
      showPort = false;
      break;
    case 'victory':
      bob = frame === 1 ? -1 : 0;
      visorWidth = 3;
      break;
  }

  const headTop = 1 + squash - bob;
  const headLeft = 2;
  const headWidth = 6;
  const headHeight = 4;

  const bodyTop = headTop + headHeight;
  const bodyLeft = 1;
  const bodyWidth = 8;
  const bodyHeight = PLAYER_SPRITE_H - headHeight - 4 - squash;

  const legY = bodyTop + bodyHeight;

  // Legs — planted asymmetrically (left leg inset less than right), not a mirrored pair.
  ctx.fillStyle = hexToCss(bodyColor, 0.9);
  ctx.fillRect(bodyLeft - legSpread * 0.3, legY, 3, 3);
  ctx.fillRect(bodyLeft + bodyWidth - 3 + legSpread * 0.3, legY, 3, 3);

  // Torso — the wide block; its width vs. the head creates the shoulder-line silhouette.
  ctx.fillStyle = hexToCss(bodyColor);
  ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
  ctx.strokeStyle = hexToCss(PALETTE.outline, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(bodyLeft + 0.5, bodyTop + 0.5, bodyWidth - 1, bodyHeight - 1);

  // Side data-port — small, asymmetric, only "on" while healthy: reads as a status light.
  if (showPort) {
    ctx.fillStyle = hexToCss(PALETTE.cyan, 0.8);
    ctx.fillRect(bodyLeft + bodyWidth - 1, bodyTop + 2, 1, 1);
  }

  // Head — narrower than the torso, sits centered on it (not on the sprite).
  ctx.fillStyle = hexToCss(bodyColor);
  ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  ctx.strokeStyle = hexToCss(PALETTE.outline, 0.6);
  ctx.strokeRect(headLeft + 0.5, headTop + 0.5, headWidth - 1, headHeight - 1);

  // Visor — a single lens, left-of-head-center, not a centered horizontal slit.
  if (visorWidth > 0) {
    const visorX = headLeft + 1;
    const visorY = headTop + 1;
    ctx.fillStyle = hexToCss(visorColor);
    ctx.shadowColor = hexToCss(visorColor, 0.9);
    ctx.shadowBlur = 2;
    ctx.fillRect(visorX, visorY, visorWidth, 2);
    ctx.shadowBlur = 0;
  }

  // Antenna — offset to the right, not centered: the single most asymmetric silhouette cue.
  ctx.fillStyle = hexToCss(visorColor, 0.85);
  ctx.fillRect(headLeft + headWidth - 2, headTop - 2, 1, 2);
}
