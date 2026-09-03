import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { TILE_SIZE } from '@/config/display';

export function drawGroundTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.bgGraphite);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.cyan, 0.5);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  ctx.fillStyle = hexToCss(PALETTE.bgIndigo, 0.6);
  ctx.fillRect(1, 3, TILE_SIZE - 2, 1);
  ctx.fillRect(2, 6, TILE_SIZE - 4, 1);
}

export function drawSpikeTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.danger);
  ctx.shadowColor = hexToCss(PALETTE.danger, 0.8);
  ctx.shadowBlur = 2;
  const spikeCount = 3;
  const spikeW = TILE_SIZE / spikeCount;
  for (let i = 0; i < spikeCount; i++) {
    const x = i * spikeW;
    ctx.beginPath();
    ctx.moveTo(x, TILE_SIZE);
    ctx.lineTo(x + spikeW / 2, TILE_SIZE - 8);
    ctx.lineTo(x + spikeW, TILE_SIZE);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

/**
 * A platform tile that looks structurally like ground but carries a visible
 * tell (a broken/dashed top edge instead of a solid one) — the honest
 * signal a "fake platform" trap must have (master-prompt §14).
 */
export function drawFakePlatformTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.bgGraphite, 0.85);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.dangerAlt, 0.7);
  ctx.fillRect(0, 0, 3, 1);
  ctx.fillRect(5, 0, 3, 1);
  ctx.fillStyle = hexToCss(PALETTE.bgIndigo, 0.5);
  ctx.fillRect(1, 4, TILE_SIZE - 2, 1);
}

/** A mechanical platform tile — cyan trim signals "this one moves". */
export function drawMovingPlatformTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.bgIndigo);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.cyan, 0.8);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  ctx.fillStyle = hexToCss(PALETTE.cyan, 0.3);
  ctx.fillRect(0, TILE_SIZE - 1, TILE_SIZE, 1);
}

/** Small hunting drone — a red glowing core, deliberately simple/cheap to render. */
export function drawPursuerIcon(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.6);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToCss(PALETTE.danger);
  ctx.shadowColor = hexToCss(PALETTE.danger, 0.9);
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawExitTile(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const color = active ? PALETTE.cyan : PALETTE.system;
  ctx.strokeStyle = hexToCss(color, 0.9);
  ctx.lineWidth = 2;
  ctx.shadowColor = hexToCss(color, 0.8);
  ctx.shadowBlur = active ? 6 : 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = hexToCss(color, active ? 0.25 : 0.08);
  ctx.fillRect(2, 2, w - 4, h - 4);
  ctx.shadowBlur = 0;
}
