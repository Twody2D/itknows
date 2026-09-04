import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from './PixelLabel';
import { playSfx } from '@/audio/SfxManager';

export type PixelButtonVariant = 'primary' | 'secondary';

export interface PixelButtonOptions {
  onClick: () => void;
  /** Fixed width. Omit to size the button from its label plus padding — which is what keeps a long RU string from filling its own frame edge to edge. */
  width?: number;
  /** Fixed height. Omit to size from the label. */
  height?: number;
  /** Label text scale — default 2 for `primary`, 1 for `secondary`. */
  textScale?: number;
  /** `primary` gets the heavier frame: double outline, side bar, corner brackets. Default `secondary`. */
  variant?: PixelButtonVariant;
}

const PAD_X = 14;
const PAD_Y = 7;
/** Length of the bracket arms drawn into each corner. */
const BRACKET = 5;

/**
 * A real shaped control — cut-corner panel, corner brackets, hover/press
 * states, a proper hit area — not bare interactive text (art-direction reset
 * §6).
 *
 * Size comes from the label by default. Hardcoding a width meant the label
 * had to be trusted to fit inside it, and PLAY (a 6-glyph RU word at scale 2)
 * didn't: it filled its 96px frame corner to corner and read as text with a
 * box jammed around it rather than as a button.
 */
export class PixelButton extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly label: PixelLabel;
  private readonly variant: PixelButtonVariant;
  private btnWidth: number;
  private btnHeight: number;
  private readonly hitZone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: PixelButtonOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    this.variant = opts.variant ?? 'secondary';

    this.panel = scene.add.graphics();
    this.add(this.panel);

    this.label = new PixelLabel(scene, 0, 0, text, {
      color: hexToCss(PALETTE.cyan),
      scale: opts.textScale ?? (this.variant === 'primary' ? 2 : 1),
      strokeColor: hexToCss(PALETTE.outline),
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    const sideBar = this.variant === 'primary' ? 8 : 0;
    this.btnWidth = opts.width ?? Math.round(this.label.width + PAD_X * 2 + sideBar * 2);
    this.btnHeight = opts.height ?? Math.round(this.label.height + PAD_Y * 2);

    this.hitZone = scene.add
      .zone(0, 0, this.btnWidth, this.btnHeight)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.add(this.hitZone);

    this.hitZone.on('pointerover', () => this.redraw(true, false));
    this.hitZone.on('pointerout', () => this.redraw(false, false));
    this.hitZone.on('pointerdown', () => this.redraw(true, true));
    this.hitZone.on('pointerup', () => {
      this.redraw(true, false);
      playSfx('uiClick');
      opts.onClick();
    });

    this.redraw(false, false);
  }

  /** Updates the button's text in place — for toggle rows (e.g. "Particles: On" / "Particles: Off") that don't need a whole new button. */
  setLabelText(text: string): void {
    this.label.setPixelText(text);
  }

  /**
   * Chamfer on the top-left and bottom-right only. Cutting all four corners
   * at this size reads as a rounded rectangle — a generic web button — once
   * the canvas is scaled up; cutting two opposite corners keeps a hard,
   * deliberate silhouette that still reads as machined.
   */
  private panelPath(g: Phaser.GameObjects.Graphics, w: number, h: number, offsetY: number, inset: number): void {
    const x0 = Math.round(-w / 2) + inset;
    const y0 = Math.round(-h / 2) + offsetY + inset;
    const x1 = Math.round(w / 2) - inset;
    const y1 = Math.round(h / 2) + offsetY - inset;
    const cut = Math.max(2, Math.min(9, Math.round(h * 0.3)) - inset);

    g.beginPath();
    g.moveTo(x0 + cut, y0);
    g.lineTo(x1, y0);
    g.lineTo(x1, y1 - cut);
    g.lineTo(x1 - cut, y1);
    g.lineTo(x0, y1);
    g.lineTo(x0, y0 + cut);
    g.closePath();
  }

  private redraw(hover: boolean, press: boolean): void {
    const g = this.panel;
    const w = this.btnWidth;
    const h = this.btnHeight;
    const offsetY = press ? 1 : 0;
    const accent = press ? PALETTE.white : hover ? PALETTE.cyan : PALETTE.cyanDim;
    const fillAlpha = hover ? 0.42 : 0.22;

    g.clear();

    g.fillStyle(PALETTE.metalMid, fillAlpha);
    g.lineStyle(1, accent, 1);
    this.panelPath(g, w, h, offsetY, 0);
    g.fillPath();
    g.strokePath();

    const x0 = Math.round(-w / 2);
    const y0 = Math.round(-h / 2) + offsetY;
    const x1 = Math.round(w / 2);
    const y1 = Math.round(h / 2) + offsetY;

    // Brackets in the two square corners — the chamfered pair already reads
    // as a corner treatment, so bracketing all four would just be noise.
    g.lineStyle(1, accent, hover ? 1 : 0.7);
    g.beginPath();
    g.moveTo(x1 - 1 - BRACKET, y0 + 2);
    g.lineTo(x1 - 1, y0 + 2);
    g.moveTo(x0 + 1, y1 - 2);
    g.lineTo(x0 + 1 + BRACKET, y1 - 2);
    g.strokePath();

    // Underline along the bottom edge: the one element that clearly changes
    // on hover, so the control has a state you can see at a glance rather
    // than a one-shade outline shift.
    const underlineInset = hover ? 4 : Math.round(w * 0.3);
    g.fillStyle(accent, hover ? 1 : 0.8);
    g.fillRect(x0 + underlineInset, y1 - 1, w - underlineInset * 2, 1);

    if (this.variant === 'primary') {
      g.lineStyle(1, accent, hover ? 0.55 : 0.3);
      this.panelPath(g, w, h, offsetY, 3);
      g.strokePath();

      // Two stacked ticks in the flank the chamfer leaves square — an
      // asymmetric detail, matching the silhouette.
      g.fillStyle(accent, hover ? 1 : 0.8);
      g.fillRect(x1 - 8, y0 + 7, 3, 1);
      g.fillRect(x1 - 8, y0 + 10, 3, 1);
    }

    this.label.setPosition(0, offsetY);
    // `primary` (PLAY) carries its own pulsing cyan glow behind it (see
    // MainMenuScene) — cyan text on top of a cyan halo that keeps breathing
    // in and out washed out to unreadable at the glow's brightest point.
    // White holds full contrast against that glow at every phase; `secondary`
    // buttons have no such glow and keep the cyan idle/hover accent.
    const labelColor = press ? PALETTE.white : this.variant === 'primary' ? PALETTE.white : PALETTE.cyan;
    this.label.setPixelColor(hexToCss(labelColor));
  }
}
