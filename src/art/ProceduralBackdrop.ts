import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';

/**
 * Radial gradient (bgIndigo → bgGraphite → bgVoid) + a faint cyan grid,
 * drawn once to a scene-local canvas texture — the "SYSTEM control room"
 * backdrop shared by `MainMenuScene` and `SectorCompleteScene` (CLAUDE.md
 * #3: a radial fill is the one thing `Graphics` can't express on its own,
 * so it goes through an offscreen canvas rather than an image file).
 * `focusX`/`focusY` are fractions of `width`/`height` for the gradient's
 * hot spot — the two screens use different ones (menu: off-center toward
 * the command column; result screen: upper-center, behind the banner).
 */
export function buildRadialGridBackdrop(
  scene: Phaser.Scene,
  width: number,
  height: number,
  textureKey: string,
  focusX: number,
  focusY: number,
): void {
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);

  const tex = scene.textures.createCanvas(textureKey, width, height);
  if (tex) {
    const ctx = tex.getContext();
    const cx = width * focusX;
    const cy = height * focusY;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 1.1);
    gradient.addColorStop(0, hexToCss(PALETTE.bgIndigo));
    gradient.addColorStop(0.45, hexToCss(PALETTE.bgGraphite));
    gradient.addColorStop(1, hexToCss(PALETTE.bgVoid));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    tex.refresh();
    scene.add.image(0, 0, textureKey).setOrigin(0, 0).setDepth(-10);
  }

  const grid = scene.add.graphics().setDepth(-9);
  for (let x = 0; x < width; x += 20) {
    grid.fillStyle(PALETTE.cyan, 0.05);
    grid.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += 20) {
    grid.fillStyle(PALETTE.cyan, 0.04);
    grid.fillRect(0, y, width, 1);
  }
}
