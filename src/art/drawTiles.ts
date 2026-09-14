import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { TILE_SIZE } from '@/config/display';

/**
 * The exit's *visual* footprint (VISUAL RESET v1 #10) — noticeably bigger
 * than its `exitCol`/`exitCol+1` gameplay footprint, the same way the
 * player's sprite overflows its own hitbox. `Level.ts` keeps the physics
 * zone at the original 2x3-tile size (`LevelValidator` checks exactly those
 * two ground columns); only the sprite drawn on top of it is this large,
 * bottom-anchored to the same ground line.
 */
export const EXIT_VISUAL_WIDTH_TILES = 3.4;
export const EXIT_VISUAL_HEIGHT_TILES = 5;

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
  ctx.fillRect(0, 3, TILE_SIZE, TILE_SIZE - 3);

  // Top edge cap — thicker and brighter than the old 1px hairline so a run
  // of ground reads as one bright "safe to stand" edge from a distance,
  // not a dotted seam you have to get close to see (VISUAL RESET v1 #8).
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, TILE_SIZE, 3);
  ctx.fillStyle = hexToCss(PALETTE.cyanDim, 0.9);
  ctx.fillRect(0, 0, TILE_SIZE, 2);

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
    ctx.shadowColor = hexToCss(PALETTE.cyan, 0.95);
    ctx.shadowBlur = 4;
    ctx.fillRect(TILE_SIZE / 2 - 1.5, 0, 3, 2);
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
  // A dark drop-off cap plus a warm warning sliver right at the lip — a gap
  // must read as a hazard boundary at a glance, not just a slightly darker
  // pixel (VISUAL RESET v1 #9: danger has to be legible to a kid, not just
  // technically telegraphed).
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.6);
  ctx.fillRect(TILE_SIZE - 3, 0, 3, TILE_SIZE);
  // Sits just below Level.ts's full-run cyan rim (2px) so it isn't painted
  // over by it — the rim says "safe surface", this says "except right here".
  ctx.fillStyle = hexToCss(PALETTE.dangerAlt, 0.85);
  ctx.shadowColor = hexToCss(PALETTE.dangerAlt, 0.85);
  ctx.shadowBlur = 3;
  ctx.fillRect(TILE_SIZE - 3, 2, 3, 3);
  ctx.shadowBlur = 0;
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

/**
 * A slab that will fall: the same platform tile, cracked.
 *
 * Stones hanging over a pit used to be drawn with the GROUND texture
 * instead — a deliberate "this is visibly not one of the level's solid
 * slabs", and from a normal viewing distance what it actually produced was
 * a row of mismatched patches: "стало видно стыки земли где яма будет"
 * (owner). A different material reads as a seam in the level's geometry,
 * not as a property of one platform.
 *
 * So it is the same object in a different state. Body, lip and footprint
 * are `drawPlatformSlab`'s exactly; what differs is a fracture across the
 * slab and a lip that has lost its brightness. That tell has to stay
 * legible — these stones sit over pits, and with a crumbling floor no
 * longer jumpable (owner's own decision, CLAUDE.md #4) stepping on one
 * over a pit costs the attempt. It is the only warning there is.
 */
export function drawPlatformSlabCracked(ctx: CanvasRenderingContext2D): void {
  drawPlatformSlab(ctx, false);
  // A dimmer lip — still the platform's own line, visibly not carrying.
  ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.55);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  ctx.fillStyle = hexToCss(PALETTE.cyanDim, 0.3);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  // The fracture: a stepped dark line, plus a highlight on its upper side
  // so it reads as a split rather than a smudge at 1px.
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.85);
  ctx.fillRect(2, 2, 1, 3);
  ctx.fillRect(3, 4, 1, 2);
  ctx.fillRect(4, 5, 2, 1);
  ctx.fillRect(6, 4, 1, 3);
  ctx.fillRect(7, 6, 1, 3);
  ctx.fillStyle = hexToCss(PALETTE.metalEdge, 0.5);
  ctx.fillRect(3, 2, 1, 2);
  ctx.fillRect(5, 4, 1, 1);
  ctx.fillRect(7, 4, 1, 2);
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
 * The exit is a big portal, not a small door (VISUAL RESET v1 #10): thick
 * struts, a deep glowing recess and a large beacon that only lights up when
 * the exit is real — a fake exit keeps the same silhouette but a dark
 * beacon (master-prompt's honesty rule: distinguishable, never a trick you
 * can't see). Proportions are ratios of `w`/`h` so the same drawing scales
 * cleanly onto a canvas noticeably bigger than the gameplay collision zone
 * (`Level.ts` centers the sprite on a smaller physics zone, same idea as
 * the player's sprite overflowing its own hitbox).
 */
export function drawExitTile(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const accent = active ? PALETTE.cyan : PALETTE.system;
  const strutW = Math.round(w * 0.16);
  const lintelH = Math.round(h * 0.1);

  // Outer halo — a big soft glow behind the whole frame, the first thing a
  // player notices about the exit from across the screen.
  if (active) {
    ctx.fillStyle = hexToCss(accent, 0.16);
    ctx.shadowColor = hexToCss(accent, 0.9);
    ctx.shadowBlur = w * 0.35;
    ctx.fillRect(strutW, lintelH, w - strutW * 2, h - lintelH);
    ctx.shadowBlur = 0;
  }

  // Side struts — thick, chamfered top corners for a machined-not-web look.
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.beginPath();
  ctx.moveTo(0, lintelH + strutW * 0.6);
  ctx.lineTo(strutW * 0.6, lintelH);
  ctx.lineTo(strutW, lintelH);
  ctx.lineTo(strutW, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, lintelH + strutW * 0.6);
  ctx.lineTo(w - strutW * 0.6, lintelH);
  ctx.lineTo(w - strutW, lintelH);
  ctx.lineTo(w - strutW, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToCss(accent, 0.65);
  ctx.fillRect(0, lintelH + strutW, Math.max(1, strutW * 0.25), h - lintelH - strutW);
  ctx.fillRect(w - Math.max(1, strutW * 0.25), lintelH + strutW, Math.max(1, strutW * 0.25), h - lintelH - strutW);

  // Lintel.
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, w, lintelH);
  ctx.fillStyle = hexToCss(accent, 0.6);
  ctx.fillRect(0, lintelH - 2, w, 2);

  // SYSTEM marker — a rune off-center on the lintel (clear of the beacon),
  // tying the gateway to THE SYSTEM's visual language rather than reading
  // as a plain UI door. Present whether the exit is real or fake.
  ctx.save();
  ctx.translate(w * 0.24, lintelH * 0.5);
  ctx.rotate(Math.PI / 4);
  const runeSize = Math.max(2, w * 0.06);
  ctx.fillStyle = hexToCss(PALETTE.system, 0.9);
  ctx.fillRect(-runeSize / 2, -runeSize / 2, runeSize, runeSize);
  ctx.restore();

  // Dark portal recess.
  ctx.fillStyle = hexToCss(PALETTE.bgVoid);
  ctx.fillRect(strutW, lintelH, w - strutW * 2, h - lintelH);
  if (active) {
    ctx.fillStyle = hexToCss(accent, 0.3);
    ctx.shadowColor = hexToCss(accent, 0.9);
    ctx.shadowBlur = w * 0.18;
    ctx.fillRect(strutW + 2, lintelH + 2, w - strutW * 2 - 4, h - lintelH - 4);
    ctx.shadowBlur = 0;
  }

  // Beacon — the honest tell: big and lit only on the real exit.
  const beaconSize = Math.max(3, w * 0.16);
  const beaconX = w / 2 - beaconSize / 2;
  if (active) {
    ctx.fillStyle = hexToCss(PALETTE.cyan);
    ctx.shadowColor = hexToCss(PALETTE.cyan, 0.95);
    ctx.shadowBlur = beaconSize * 1.4;
    ctx.fillRect(beaconX, 0, beaconSize, lintelH * 0.9);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = hexToCss(PALETTE.outline, 0.8);
    ctx.fillRect(beaconX, 0, beaconSize, lintelH * 0.9);

    // BOARDED SHUT. An unlit beacon is the honest tell required by
    // CLAUDE.md #4.7, and it turned out not to be a legible one: the owner
    // met this door repeatedly and still asked "так и не понятно что за
    // фиолетовый портал, зачем он". A dark doorway reads as a doorway, and
    // a player who cannot tell a decoy from an exit is not being tested,
    // they are being confused.
    //
    // Two beams across the opening say the one thing the unlit beacon was
    // trying to say, in a vocabulary nobody has to be taught: this door
    // does not open, the way out is somewhere else. The frame, the rune and
    // the recess are untouched, so it is still unmistakably the same object
    // as the real exit — which is the whole point of the trap.
    const inset = strutW + 2;
    const openW = w - inset * 2;
    const openH = h - lintelH - 4;
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset, lintelH + 2, openW, openH);
    ctx.clip();
    ctx.strokeStyle = hexToCss(PALETTE.metalEdge, 0.95);
    ctx.lineWidth = Math.max(2, w * 0.07);
    ctx.beginPath();
    ctx.moveTo(inset - 4, lintelH + 2);
    ctx.lineTo(inset + openW + 4, lintelH + 2 + openH);
    ctx.moveTo(inset + openW + 4, lintelH + 2);
    ctx.lineTo(inset - 4, lintelH + 2 + openH);
    ctx.stroke();
    ctx.strokeStyle = hexToCss(PALETTE.dangerAlt, 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
