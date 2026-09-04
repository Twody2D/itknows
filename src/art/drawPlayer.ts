import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import type { PlayerAnimState } from '@/gameplay/PlayerAnimState';
import { PLAYER_SPRITE_H, PLAYER_SPRITE_W } from './PLAYER_SPRITE';

/**
 * VISUAL RESET v1 (master-prompt "big character" rule): the android is
 * redrawn at ~2.4x the old frame size and built from a handful of large,
 * chunky blocks — head, torso, two arms, two legs — instead of a small
 * silhouette that only reads up close. Same asymmetric-silhouette idea as
 * before (narrow head on a wider torso, one bright lens off-center, an
 * antenna on the right) but every shape is big enough to read at arm's
 * length on a phone screen without zooming in.
 */
/** A skin's base look — `drawPlayerFrame` still overrides both on hurt/death/victory regardless (see its doc comment), so a skin can never mask those gameplay signals. */
export interface PlayerColors {
  body: number;
  visor: number;
}

export function drawPlayerFrame(
  ctx: CanvasRenderingContext2D,
  state: PlayerAnimState,
  frame: number,
  colors?: PlayerColors,
): void {
  ctx.clearRect(0, 0, PLAYER_SPRITE_W, PLAYER_SPRITE_H);

  const bodyColor: number = state === 'hurt' ? PALETTE.danger : (colors?.body ?? PALETTE.white);
  let visorColor: number = colors?.visor ?? PALETTE.cyan;
  if (state === 'hurt' || state === 'death') visorColor = PALETTE.danger;
  if (state === 'victory') visorColor = PALETTE.reward;

  let squash = 0;
  let legSpread = 0;
  let armSwing = 0;
  let bob = 0;
  let visorWidth = 6;
  let showPort = true;

  switch (state) {
    case 'idle':
      bob = frame === 1 ? 2 : 0;
      break;
    case 'run':
      legSpread = frame % 2 === 0 ? 4 : -4;
      armSwing = frame % 2 === 0 ? -3 : 3;
      bob = frame % 2 === 0 ? 0 : 2;
      break;
    case 'jump':
      squash = -3;
      visorWidth = 8;
      break;
    case 'fall':
      legSpread = 2;
      visorWidth = 4;
      break;
    case 'land':
      squash = 5;
      legSpread = 6;
      break;
    case 'hurt':
      visorWidth = 3;
      showPort = false;
      break;
    case 'death':
      visorWidth = 0;
      showPort = false;
      break;
    case 'victory':
      bob = frame === 1 ? -2 : 0;
      visorWidth = 8;
      break;
  }

  const baseHeadTop = 2;
  const headHeight = 10;
  const legHeight = 8;

  const headTop = baseHeadTop + squash - bob;
  const headLeft = 6;
  const headWidth = 12;

  const bodyTop = headTop + headHeight;
  const bodyLeft = 4;
  const bodyWidth = 16;
  const bodyHeight = PLAYER_SPRITE_H - baseHeadTop - headHeight - legHeight - squash;

  const legY = bodyTop + bodyHeight;
  const armTop = bodyTop + 2;
  const armHeight = 10;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = hexToCss(PALETTE.outline, 0.5);

  // Legs — planted asymmetrically, one wider stance than the other.
  ctx.fillStyle = hexToCss(bodyColor, 0.92);
  ctx.fillRect(bodyLeft + 1 - legSpread * 0.4, legY, 6, legHeight);
  ctx.fillRect(bodyLeft + bodyWidth - 7 + legSpread * 0.4, legY, 6, legHeight);

  // Arms — flank the torso, swing opposite the legs while running.
  ctx.fillStyle = hexToCss(bodyColor, 0.85);
  ctx.fillRect(bodyLeft - 4, armTop + armSwing * 0.5, 4, armHeight);
  ctx.fillRect(bodyLeft + bodyWidth, armTop - armSwing * 0.5, 4, armHeight);

  // Torso — the wide block that creates the shoulder-line silhouette against the narrower head.
  ctx.fillStyle = hexToCss(bodyColor);
  ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
  ctx.strokeRect(bodyLeft + 0.75, bodyTop + 0.75, bodyWidth - 1.5, bodyHeight - 1.5);

  // Side data-port — only lit while healthy, reads as a status light.
  if (showPort) {
    ctx.fillStyle = hexToCss(PALETTE.cyan, 0.85);
    ctx.fillRect(bodyLeft + bodyWidth - 1, bodyTop + 4, 2, 3);
  }

  // Head — narrower than the torso, sits centered on it.
  ctx.fillStyle = hexToCss(bodyColor);
  ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  ctx.strokeRect(headLeft + 0.75, headTop + 0.75, headWidth - 1.5, headHeight - 1.5);

  // Visor — one big lens, left-of-center, the brightest thing on the character.
  if (visorWidth > 0) {
    const visorX = headLeft + 2;
    const visorY = headTop + 3;
    ctx.fillStyle = hexToCss(visorColor);
    ctx.shadowColor = hexToCss(visorColor, 0.9);
    ctx.shadowBlur = 4;
    ctx.fillRect(visorX, visorY, visorWidth, 4);
    ctx.shadowBlur = 0;
  }

  // Antenna — offset to the right, the single most asymmetric silhouette cue.
  ctx.fillStyle = hexToCss(visorColor, 0.9);
  ctx.fillRect(headLeft + headWidth - 3, headTop - 3, 2, 3);
}
