import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from './PixelLabel';

/** Arrow keys and the space bar have no glyph in the bitmap font, so they're drawn instead of typed. */
export type KeyCapSymbol = 'arrow-up' | 'arrow-left' | 'arrow-right' | 'arrow-down' | 'space';

export interface KeyCapSpec {
  /** A character to print on the cap (uppercased by the font). Mutually exclusive with `symbol`. */
  text?: string;
  symbol?: KeyCapSymbol;
}

const CAP = 13;
const SPACE_WIDTH = 30;

/**
 * A drawn keyboard key — light cap, dark legend, a pixel of depth under it —
 * the same shorthand every game uses to say "press this," and far faster to
 * read mid-play than the string "Space - Jump" (which also assumed one
 * binding when the game accepts three).
 */
export class KeyCap extends Phaser.GameObjects.Container {
  readonly capWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, spec: KeyCapSpec) {
    super(scene, x, y);
    scene.add.existing(this);

    this.capWidth = spec.symbol === 'space' ? SPACE_WIDTH : CAP;
    const w = this.capWidth;
    const h = CAP;
    const x0 = Math.round(-w / 2);
    const y0 = Math.round(-h / 2);

    const g = scene.add.graphics();
    this.add(g);

    // Drop shadow first, so the cap sits on top of it.
    g.fillStyle(PALETTE.outline, 0.55);
    g.fillRect(x0 + 1, y0 + 2, w, h);

    g.fillStyle(PALETTE.white, 1);
    g.fillRect(x0, y0, w, h);
    // Bevel: a darker bottom/right edge is all it takes to read as a physical key.
    g.fillStyle(PALETTE.metalEdge, 1);
    g.fillRect(x0, y0 + h - 2, w, 2);
    g.fillRect(x0 + w - 1, y0, 1, h);
    g.lineStyle(1, PALETTE.metalDark, 1);
    g.strokeRect(x0, y0, w, h);

    if (spec.symbol) {
      this.drawSymbol(g, spec.symbol, w);
    } else if (spec.text) {
      const legend = new PixelLabel(scene, 0, -1, spec.text, { color: hexToCss(PALETTE.metalDark), scale: 1 });
      legend.setOrigin(0.5, 0.5);
      this.add(legend);
    }
  }

  private drawSymbol(g: Phaser.GameObjects.Graphics, symbol: KeyCapSymbol, w: number): void {
    g.fillStyle(PALETTE.metalDark, 1);

    if (symbol === 'space') {
      // The space bar's legend is the bar itself.
      g.fillRect(Math.round(-w / 2) + 6, -1, w - 12, 2);
      return;
    }

    // Arrows are drawn as a 5px pixel triangle plus a 3px stem — hand-placed
    // rows rather than a filled path, so they stay hard-edged at 1:1.
    const rows = [1, 3, 5];
    if (symbol === 'arrow-up' || symbol === 'arrow-down') {
      const dir = symbol === 'arrow-up' ? 1 : -1;
      rows.forEach((len, i) => {
        g.fillRect(Math.round(-len / 2), -1 - dir * (2 - i), len, 1);
      });
      g.fillRect(-1, symbol === 'arrow-up' ? 0 : -4, 2, 4);
    } else {
      const dir = symbol === 'arrow-left' ? 1 : -1;
      rows.forEach((len, i) => {
        g.fillRect(-1 - dir * (2 - i), Math.round(-len / 2) - 1, 1, len);
      });
      g.fillRect(symbol === 'arrow-left' ? 0 : -4, -2, 4, 2);
    }
  }
}

/**
 * The touch equivalent of a keycap: a ring matching the on-screen thumb
 * button, with the same chevron on it, so a phone player is shown the control
 * they actually have instead of a keyboard they don't.
 */
export class TouchHintButton extends Phaser.GameObjects.Container {
  readonly capWidth = 24;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: 'left' | 'right' | 'up') {
    super(scene, x, y);
    scene.add.existing(this);

    const g = scene.add.graphics();
    this.add(g);

    const r = 11;
    g.fillStyle(PALETTE.cyan, 0.18);
    g.fillCircle(0, 0, r);
    g.lineStyle(1, PALETTE.cyan, 0.9);
    g.strokeCircle(0, 0, r);

    g.fillStyle(PALETTE.white, 1);
    if (direction === 'up') {
      for (let i = 0; i < 4; i++) g.fillRect(-i - 1, -3 + i, i * 2 + 1, 1);
      g.fillRect(-1, 1, 2, 4);
    } else {
      const dir = direction === 'left' ? -1 : 1;
      for (let i = 0; i < 4; i++) g.fillRect(dir * (3 - i) - (dir < 0 ? 1 : 0), -i - 1, 1, i * 2 + 1);
      g.fillRect(-dir * 4, -1, 4, 2);
    }
  }
}

/**
 * Lays out a row of caps (plus optional plain-text separators like "или")
 * centred on `x`, and returns every object created so a caller can fade or
 * destroy the row as one unit.
 */
export function buildKeyRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  items: Array<KeyCapSpec | { separator: string } | { touch: 'left' | 'right' | 'up' }>,
  gap = 4,
): Phaser.GameObjects.GameObject[] {
  const built: Array<{ obj: Phaser.GameObjects.Container | PixelLabel; width: number }> = [];

  for (const item of items) {
    if ('separator' in item) {
      const label = new PixelLabel(scene, 0, y, item.separator, { color: hexToCss(PALETTE.cyanDim), scale: 1 });
      label.setOrigin(0.5, 0.5);
      built.push({ obj: label, width: label.width });
    } else if ('touch' in item) {
      const button = new TouchHintButton(scene, 0, y, item.touch);
      built.push({ obj: button, width: button.capWidth });
    } else {
      const cap = new KeyCap(scene, 0, y, item);
      built.push({ obj: cap, width: cap.capWidth });
    }
  }

  const total = built.reduce((sum, b) => sum + b.width, 0) + gap * (built.length - 1);
  let cursor = Math.round(x - total / 2);
  for (const b of built) {
    b.obj.setPosition(Math.round(cursor + b.width / 2), y);
    cursor += b.width + gap;
  }

  return built.map((b) => b.obj);
}
