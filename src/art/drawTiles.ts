import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { TILE_SIZE } from '@/config/display';

/**
 * Modular ground/platform materials (art-direction reset, gameplay-screen
 * pass): the top surface is composited from a handful of deterministic 10x10
 * tiles whose seam position, tone, and lights vary by column-derived hash
 * (`hash.ts`), chosen in `Level.ts`. A tile with no edge seam reads as the
 * *middle* of a wider panel, so a run of tiles looks like irregular-width
 * panels instead of one tiny repeating unit — same reproducible-from-position
 * discipline CLAUDE.md #4.6 asks of gameplay RNG, applied to the world's look.
 */
export function drawGroundTop(ctx: CanvasRenderingContext2D, seam: 0 | 1 | 2 | 3, light: boolean): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalMid);
  ctx.fillRect(0, 2, TILE_SIZE, TILE_SIZE - 2);

  // Top edge cap — the readable "this is a surface" line.
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  ctx.fillStyle = hexToCss(PALETTE.cyanDim, 0.8);
  ctx.fillRect(0, 0, TILE_SIZE, 1);

  // Panel seam(s) — position varies by variant so consecutive tiles don't all
  // look like their own tiny panel; seam 3 has none (mid-panel), the rest cut
  // the tile at a different point instead of always both edges.
  ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.6);
  if (seam === 0) {
    ctx.fillRect(0, 4, 1, TILE_SIZE - 4);
    ctx.fillRect(TILE_SIZE - 1, 4, 1, TILE_SIZE - 4);
  } else if (seam === 1) {
    ctx.fillRect(3, 4, 1, TILE_SIZE - 4);
  } else if (seam === 2) {
    ctx.fillRect(7, 4, 1, TILE_SIZE - 4);
  }

  if (light) {
    ctx.fillStyle = hexToCss(PALETTE.cyan);
    ctx.shadowColor = hexToCss(PALETTE.cyan, 0.9);
    ctx.shadowBlur = 3;
    ctx.fillRect(TILE_SIZE / 2 - 1, 1, 2, 1);
    ctx.shadowBlur = 0;
  }
}

/** A rare scuffed/damaged panel — small dark notch, breaks the "every tile is pristine" rhythm. */
export function drawGroundDamaged(ctx: CanvasRenderingContext2D, notchX: number): void {
  drawGroundTop(ctx, 3, false);
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.5);
  ctx.fillRect(notchX, 2, 2, 2);
  ctx.fillStyle = hexToCss(PALETTE.dangerAlt, 0.25);
  ctx.fillRect(notchX, 1, 2, 1);
}

export function drawGroundEdge(ctx: CanvasRenderingContext2D): void {
  drawGroundTop(ctx, 0, false);
  // A darker drop-off cap facing the gap — reads as "this is where it ends".
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.5);
  ctx.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);
}

export function drawGroundFill(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.6);
  ctx.fillRect(0, 0, 1, TILE_SIZE);
  ctx.fillRect(TILE_SIZE - 1, 0, 1, TILE_SIZE);
}

/** A floating structural slab — visually distinct from ground so "what I can stand on" reads at a glance. */
export function drawPlatformSlab(ctx: CanvasRenderingContext2D, bolt: boolean): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalMid);
  ctx.fillRect(0, 1, TILE_SIZE, TILE_SIZE - 2);
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  ctx.fillRect(0, TILE_SIZE - 1, TILE_SIZE, 1);
  ctx.fillStyle = hexToCss(PALETTE.cyanDim, 0.7);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  if (bolt) {
    ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.8);
    ctx.fillRect(2, 4, 1, 1);
    ctx.fillRect(TILE_SIZE - 3, 4, 1, 1);
  }
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
  ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.85);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.dangerAlt, 0.7);
  ctx.fillRect(0, 0, 3, 1);
  ctx.fillRect(5, 0, 3, 1);
  ctx.fillStyle = hexToCss(PALETTE.metalEdge, 0.5);
  ctx.fillRect(1, 4, TILE_SIZE - 2, 1);
}

/** A mechanical platform tile — cyan trim signals "this one moves". */
export function drawMovingPlatformTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalMid);
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

/**
 * The exit is a gate, not a glowing rectangle: two side struts, a lintel,
 * a dark portal recess, and a beacon on top that only lights up when the
 * exit is real — a fake exit keeps the same silhouette but a dark beacon
 * (master-prompt's honesty rule: distinguishable, never a trick you can't see).
 */
export function drawExitTile(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const accent = active ? PALETTE.cyan : PALETTE.system;
  const strutW = 3;

  // Side struts.
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 3, strutW, h - 3);
  ctx.fillRect(w - strutW, 3, strutW, h - 3);
  ctx.fillStyle = hexToCss(accent, 0.55);
  ctx.fillRect(0, 3, 1, h - 3);
  ctx.fillRect(w - 1, 3, 1, h - 3);

  // Lintel.
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, w, 4);
  ctx.fillStyle = hexToCss(accent, 0.5);
  ctx.fillRect(0, 3, w, 1);

  // SYSTEM marker — a small rune off-center on the lintel (clear of the
  // beacon), tying the gateway to THE SYSTEM's visual language rather than
  // reading as a plain UI door (art-direction reset §7). Present whether the
  // exit is real or fake.
  ctx.save();
  ctx.translate(w * 0.22, 1.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = hexToCss(PALETTE.system, 0.85);
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  // Dark portal recess.
  ctx.fillStyle = hexToCss(PALETTE.bgVoid);
  ctx.fillRect(strutW, 4, w - strutW * 2, h - 4);
  if (active) {
    ctx.fillStyle = hexToCss(accent, 0.22);
    ctx.shadowColor = hexToCss(accent, 0.8);
    ctx.shadowBlur = 5;
    ctx.fillRect(strutW + 1, 5, w - strutW * 2 - 2, h - 6);
    ctx.shadowBlur = 0;
  }

  // Beacon — the honest tell: lit only on the real exit.
  const beaconX = w / 2 - 1;
  if (active) {
    ctx.fillStyle = hexToCss(PALETTE.cyan);
    ctx.shadowColor = hexToCss(PALETTE.cyan, 0.9);
    ctx.shadowBlur = 4;
    ctx.fillRect(beaconX, 0, 2, 2);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = hexToCss(PALETTE.outline, 0.8);
    ctx.fillRect(beaconX, 0, 2, 2);
  }
}
