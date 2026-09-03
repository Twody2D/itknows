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
