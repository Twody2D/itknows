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
export function drawGroundTop(ctx: CanvasRenderingContext2D, light: boolean): void {
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

  // NO PANEL SEAMS. The surface used to carry a per-column dark hairline in
  // one of four positions, so a run would read as panels of varying width
  // rather than one unit repeated. It cost more than it bought.
  //
  // The game runs at a fixed virtual height of 270 and is stretched to the
  // window, so on a real screen every one of those 1px lines is drawn 3-4px
  // wide — the owner's window measured 1880x900, a scale of 3.33. What he
  // saw was a floor ruled with dark vertical ticks at irregular intervals,
  // and on a floor that can give way at any column, a tick is a mark:
  // "тёмная засечка... я вижу стык где будет яма". Three rounds went into
  // hunting a seam that was never in one place, because it was in all of
  // them.
  //
  // The surface keeps its variety where it cannot be mistaken for a
  // warning: the lamp below, and the lit/unlit split across columns. The
  // only vertical marks left on the floor are the ones that MEAN something
  // — `drawGroundEdge`'s warm lip at the edge of a real hole.
  if (light) {
    ctx.fillStyle = hexToCss(PALETTE.cyan);
    ctx.shadowColor = hexToCss(PALETTE.cyan, 0.95);
    ctx.shadowBlur = 4;
    ctx.fillRect(TILE_SIZE / 2 - 1.5, 0, 3, 2);
    ctx.shadowBlur = 0;
  }

  // THE BRIGHT LIP LIVES HERE, IN THE TILE, and that is the whole point of
  // this line. It used to be painted over the finished floor as one long
  // `Rectangle` per run of ground, with a second one per trapdoor and per
  // sliding slab — and where two of those met, the shared pixel came out
  // unpainted: the ground's own dim lip showing through a one-pixel gap in
  // the bright one. On the owner's screen every virtual pixel is drawn
  // three to four wide, so that gap was a tick mark, sitting precisely at
  // the seam between the floor and the thing that was about to drop out of
  // it — measured at world col 37 on BOOT, 15/25/35/42 on DROP, 40 on BEAM,
  // and so on down the list. A mark that appears exactly where a trapdoor
  // starts is the one mark this floor must never carry.
  //
  // Tiles are textured quads and butt together exactly; overlaid shapes did
  // not. So the lip is part of the material now, every tile carries its
  // own, and there is no seam left to leave a gap in. The colors are the
  // old two passes in the old order (dim under bright), so the floor looks
  // exactly as it did — it just no longer has a joint.
  ctx.fillStyle = hexToCss(PALETTE.cyan, 0.85);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
}

export function drawGroundEdge(ctx: CanvasRenderingContext2D, side: 'left' | 'right'): void {
  drawGroundTop(ctx, false);
  // A warm sliver right at the lip: a hole has to read as a hazard boundary
  // at a glance (VISUAL RESET v1 #9).
  //
  // The dark cap that used to sit under it is gone. It was a 3px block of
  // `outline` running the full height of the tile, and that is a black
  // vertical bar on the floor — the last of the ruling that had the owner
  // reading marks into the ground ("чёрная засечка на яме так и не
  // исчезла"). The warm sliver was always the part that carried the
  // meaning; the bar only made it look like the floor was cracked there.
  //
  // It also belongs on the side the hole is actually on. One tile served
  // both edges and always marked its right-hand side, so the lip on the far
  // side of a pit was drawn on the wrong end of the tile.
  const x = side === 'right' ? TILE_SIZE - 3 : 0;
  ctx.fillStyle = hexToCss(PALETTE.dangerAlt, 0.85);
  ctx.shadowColor = hexToCss(PALETTE.dangerAlt, 0.85);
  ctx.shadowBlur = 3;
  ctx.fillRect(x, 2, 3, 3);
  ctx.shadowBlur = 0;
}

export function drawGroundFill(ctx: CanvasRenderingContext2D): void {
  // Flat. The sub-surface rock used to be edged with a darker line on both
  // sides, which in a tiled sprite repeats as a dark tick every 10px — the
  // same false ruling the surface carried, one row lower. See
  // `drawGroundTop` for why none of it survives.
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
}

/**
 * A floating structural slab — the SAME MATERIAL as the ground, by the
 * owner's request ("сделай чтобы платформы которые летают были такого же
 * цвета как и основная земля").
 *
 * It used to be its own thing: a thinner cap, a dimmer lip, a slightly
 * different body, on the theory that "what I can stand on" should be
 * distinguishable from the floor. In practice both are things you stand on,
 * and two greys that nearly match read as an inconsistency rather than as
 * information. The top is now byte-identical to `drawGroundTop`'s — same
 * cap, same lip — and the only thing that differs is the underside, which
 * ground does not have: a dark line so a slab hanging in the air still has
 * a bottom edge.
 */
export function drawPlatformSlab(ctx: CanvasRenderingContext2D, bolt: boolean): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalMid);
  ctx.fillRect(0, 3, TILE_SIZE, TILE_SIZE - 4);
  ctx.fillStyle = hexToCss(PALETTE.metalEdge);
  ctx.fillRect(0, 0, TILE_SIZE, 3);
  ctx.fillStyle = hexToCss(PALETTE.cyanDim, 0.9);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  // The same bright lip the ground carries, for the same reason — see
  // `drawGroundTop`. Both passes, in both places, or the two materials stop
  // matching.
  ctx.fillStyle = hexToCss(PALETTE.cyan, 0.85);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  // The underside — the one honest difference from ground, which has none.
  ctx.fillStyle = hexToCss(PALETTE.outline, 0.55);
  ctx.fillRect(0, TILE_SIZE - 1, TILE_SIZE, 1);
  if (bolt) {
    ctx.fillStyle = hexToCss(PALETTE.metalDark, 0.8);
    ctx.fillRect(2, 6, 1, 1);
    ctx.fillRect(TILE_SIZE - 3, 6, 1, 1);
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

/**
 * A conveyor tile — the sector-08 mechanic (`traps/ConveyorTrap.ts`).
 *
 * Drawn pointing RIGHT; a leftward belt is the same texture flipped, so the
 * chevrons always read as the direction the floor is taking you. The strip
 * is a `TileSprite` whose `tilePositionX` scrolls at the belt's own speed,
 * which is why the chevrons are evenly spaced and tile seamlessly: the
 * motion has to be the telegraph, the way a patrolling spike's motion is.
 */
export function drawConveyorTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = hexToCss(PALETTE.metalDark);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Rollers along the bottom, so the tile reads as machinery even standing still.
  ctx.fillStyle = hexToCss(PALETTE.metalMid);
  ctx.fillRect(0, TILE_SIZE - 3, TILE_SIZE, 3);
  ctx.fillStyle = hexToCss(PALETTE.reward, 0.85);
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  // One chevron per tile: two diagonals meeting at the right edge.
  ctx.fillStyle = hexToCss(PALETTE.reward, 0.55);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(2 + i, 3 + i, 1, 1);
    ctx.fillRect(2 + i, 7 - i, 1, 1);
  }
  ctx.fillRect(5, 5, 1, 1);
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
