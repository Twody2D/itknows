import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';

/** Cut-corner panel background — the same visual language as `PixelButton` (art-direction reset), reused for every overlay screen (Pause/Settings/How to Play). */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cut = 8): void {
  g.fillStyle(PALETTE.bgGraphite, 0.94);
  g.lineStyle(1, PALETTE.cyanDim, 0.9);

  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;

  g.beginPath();
  g.moveTo(x0 + cut, y0);
  g.lineTo(x1 - cut, y0);
  g.lineTo(x1, y0 + cut);
  g.lineTo(x1, y1 - cut);
  g.lineTo(x1 - cut, y1);
  g.lineTo(x0 + cut, y1);
  g.lineTo(x0, y1 - cut);
  g.lineTo(x0, y0 + cut);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** Full-viewport dim backdrop so the scene underneath (menu or paused gameplay) stays visible but recedes — every overlay scene starts with one. */
export function buildDimBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add.rectangle(0, 0, width, height, PALETTE.bgVoid, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(-1);
}
