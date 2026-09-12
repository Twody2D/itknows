import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { GLYPHS } from '@/art/font/glyphs';

export type MenuIconKind = 'play' | 'levels' | 'shop' | 'help' | 'settings' | 'skin';

/**
 * Kinds whose shape is built from diagonals. The canvas is blown up with
 * nearest-neighbour filtering, which turns any diagonal drawn into it into a
 * staircase, so these two are drawn on the DOM layer instead (`ui/glyphs`)
 * and this class leaves them alone. Everything else here is axis-aligned
 * rectangles, which survive the upscale as the crisp blocks they are meant
 * to be.
 */
export const DIAGONAL_ICONS: ReadonlySet<MenuIconKind> = new Set<MenuIconKind>(['play', 'skin']);

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
  private accent: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly kind: MenuIconKind, accent: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.accent = accent;
    this.g = scene.add.graphics();
    this.add(this.g);

    this.redraw();
  }

  setAccent(accent: number): void {
    if (this.accent === accent) return;
    this.accent = accent;
    this.redraw();
  }

  private redraw(): void {
    const g = this.g;
    g.clear();
    if (DIAGONAL_ICONS.has(this.kind)) return;

    switch (this.kind) {
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
    }
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

  /**
   * A ringed "?" — the most universally understood help mark there is.
   *
   * The mark itself reuses the bitmap font's own "?" shape (`art/font/
   * glyphs.ts`) drawn as chunky blocks, not rendered through `PixelLabel`: a
   * real glyph at a size that just fits the ring touched the ring's stroke
   * on every side and the two blurred into one smudge (project owner
   * feedback from a live screenshot) — a smaller, bolder block version
   * drawn a size down leaves a clear gap from the ring and reads instantly,
   * plus it's the exact "?" the player already recognizes from in-game text.
   */
  private drawHelp(g: Phaser.GameObjects.Graphics): void {
    const ringRadius = 8;
    g.lineStyle(2, this.accent, 1);
    g.strokeCircle(0, 0, ringRadius);

    const rows = GLYPHS['?'] ?? [];
    const px = 1.3;
    const cols = rows[rows.length - 1]?.length ?? 5;
    const w = cols * px;
    const h = rows.length * px;
    g.fillStyle(this.accent, 1);
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '1') g.fillRect(-w / 2 + rx * px, -h / 2 + ry * px, px, px);
      }
    });
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

}
