import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import type { PlayerAnimState } from '@/gameplay/PlayerAnimState';
import { PLAYER_SPRITE_H, PLAYER_SPRITE_W } from './PLAYER_SPRITE';

/**
 * The android is drawn from primitives, not raster art (CLAUDE.md #3): a
 * body block, a glowing visor whose shape carries the emotion, and two legs.
 * Fidelity is intentionally minimal here — Phase 4 refines the silhouette,
 * this only has to read clearly at low res and be cheap to regenerate.
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
  let visorWidth = 6;
  let visorHeight = 2;

  switch (state) {
    case 'idle':
      bob = frame === 1 ? 1 : 0;
      break;
    case 'run':
      legSpread = frame % 2 === 0 ? 2 : -2;
      bob = frame % 2 === 0 ? 0 : 1;
      break;
    case 'jump':
      legSpread = 0;
      squash = -1;
      visorHeight = 3;
      break;
    case 'fall':
      legSpread = 1;
      visorWidth = 4;
      break;
    case 'land':
      squash = 2;
      legSpread = 3;
      break;
    case 'hurt':
      visorWidth = 3;
      break;
    case 'death':
      visorWidth = 2;
      visorHeight = 1;
      break;
    case 'victory':
      bob = frame === 1 ? -1 : 0;
      visorWidth = 7;
      break;
  }

  const bodyTop = 2 + squash - bob;
  const bodyHeight = PLAYER_SPRITE_H - 5 - squash;
  const bodyLeft = 1;
  const bodyWidth = PLAYER_SPRITE_W - 2;

  // Legs
  ctx.fillStyle = hexToCss(bodyColor, 0.9);
  const legY = bodyTop + bodyHeight;
  ctx.fillRect(bodyLeft - legSpread * 0.3, legY, 3, 3);
  ctx.fillRect(bodyLeft + bodyWidth - 3 + legSpread * 0.3, legY, 3, 3);

  // Body
  ctx.fillStyle = hexToCss(bodyColor);
  ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);

  // Outline
  ctx.strokeStyle = hexToCss(PALETTE.outline, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(bodyLeft + 0.5, bodyTop + 0.5, bodyWidth - 1, bodyHeight - 1);

  // Visor
  const visorX = bodyLeft + (bodyWidth - visorWidth) / 2;
  const visorY = bodyTop + 2;
  ctx.fillStyle = hexToCss(visorColor);
  ctx.shadowColor = hexToCss(visorColor, 0.9);
  ctx.shadowBlur = 3;
  ctx.fillRect(visorX, visorY, visorWidth, visorHeight);
  ctx.shadowBlur = 0;

  // Antenna
  ctx.fillStyle = hexToCss(visorColor, 0.8);
  ctx.fillRect(bodyLeft + bodyWidth / 2 - 0.5, bodyTop - 2, 1, 2);
}
