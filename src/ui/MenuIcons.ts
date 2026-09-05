import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from './PixelLabel';

export type MenuIconKind = 'play' | 'levels' | 'shop' | 'help' | 'settings' | 'skin';

/**
 * Menu button pictograms, drawn as pure geometry at the size they're shown.
 *
 * Every one is legible before it's read — that's the point of pairing them
 * with the labels rather than shipping text alone (7-9 year olds read by
 * syllable, so the picture arrives first and the word teaches). Which also
 * dictates the shapes: a gear at 18px turns to mush, so SETTINGS is three
 * sliders; LEVELS is a 2x2 progress grid with one cell still locked, which
 * says "map" without a map.
 *
 * Drawn, not from an atlas — CLAUDE.md #3 ships zero binary assets, and at
 * these sizes a few `fillRect`s are cheaper than a texture lookup anyway.
 */
export class MenuIcon extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly questionMark?: PixelLabel;
  private accent: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly kind: MenuIconKind, accent: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.accent = accent;
    this.g = scene.add.graphics();
    this.add(this.g);

    if (kind === 'help') {
      // The one glyph geometry can't carry: "?" is a letterform, so it comes
      // from the project's own bitmap font rather than a hand-drawn path.
      this.questionMark = new PixelLabel(scene, 0, 0, '?', { color: hexToCss(accent), scale: 2 });
      this.questionMark.setOrigin(0.5, 0.5);
      this.add(this.questionMark);
    }

    this.redraw();
  }

  setAccent(accent: number): void {
    if (this.accent === accent) return;
    this.accent = accent;
    this.questionMark?.setPixelColor(hexToCss(accent));
    this.redraw();
  }

  private redraw(): void {
    const g = this.g;
    g.clear();

    switch (this.kind) {
      case 'play':
        this.drawPlay(g);
        break;
      case 'levels':
        this.drawLevels(g);
        break;
      case 'shop':
        this.drawShop(g);
        break;
      case 'help':
        this.drawHelp(g);
        break;
      case 'settings':
        this.drawSettings(g);
        break;
      case 'skin':
        this.drawSkin(g);
        break;
    }
  }

  /** 22x28 solid triangle pointing right — universal "start", and the only filled shape in the menu. */
  private drawPlay(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(this.accent, 1);
    g.beginPath();
    g.moveTo(-11, -14);
    g.lineTo(11, 0);
    g.lineTo(-11, 14);
    g.closePath();
    g.fillPath();
  }

  /** Four 7x7 cells, 2px gutter: three lit (cleared), one dim (locked) — reads as a progress map. */
  private drawLevels(g: Phaser.GameObjects.Graphics): void {
    const cell = 7;
    const gap = 2;
    const origin = -(cell * 2 + gap) / 2;
    const cells: Array<[number, number, boolean]> = [
      [0, 0, true],
      [1, 0, true],
      [0, 1, true],
      [1, 1, false],
    ];

    for (const [cx, cy, lit] of cells) {
      g.fillStyle(lit ? this.accent : PALETTE.metalEdge, 1);
      g.fillRect(origin + cx * (cell + gap), origin + cy * (cell + gap), cell, cell);
    }
  }

  /** A 16x9 bag under a 2px handle arc — the shopping-bag silhouette survives at this size where a cart doesn't. */
  private drawShop(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(this.accent, 1);
    g.fillRect(-8, -3, 16, 9);

    g.lineStyle(2, this.accent, 1);
    g.beginPath();
    g.moveTo(-4, -3);
    g.lineTo(-4, -8);
    g.lineTo(4, -8);
    g.lineTo(4, -3);
    g.strokePath();
  }

  /** A ringed "?" — the most universally understood help mark there is. */
  private drawHelp(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(2, this.accent, 1);
    g.strokeCircle(0, 0, 8);
  }

  /** Three sliders at different positions — "things you can adjust", where a gear would blur. */
  private drawSettings(g: Phaser.GameObjects.Graphics): void {
    const knobX = [-7, 1, -3];
    for (let row = 0; row < 3; row++) {
      const y = -6 + row * 6;
      // The tracks are a step lighter than the spec's `metalEdge`, which sat
      // barely above the tile's own fill and left the icon reading as three
      // loose blocks instead of three sliders. The metaphor is the whole
      // point of choosing sliders over a gear, so it has to survive.
      g.fillStyle(PALETTE.textDisabled, 1);
      g.fillRect(-9, y, 18, 3);
      g.fillStyle(this.accent, 1);
      g.fillRect(knobX[row] as number, y - 2, 5, 7);
    }
  }

  /** An 8x8 square on its corner — a loose "part/plate you can swap". */
  private drawSkin(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(this.accent, 1);
    g.beginPath();
    g.moveTo(0, -5);
    g.lineTo(5, 0);
    g.lineTo(0, 5);
    g.lineTo(-5, 0);
    g.closePath();
    g.fillPath();
  }
}
