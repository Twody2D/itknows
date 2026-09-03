import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from './PixelLabel';

export interface PixelButtonOptions {
  width: number;
  height: number;
  onClick: () => void;
  /** Label text scale — default 2 (primary actions like PLAY). Longer RU strings (settings rows, "Главное меню") need 1 to fit a reasonably sized button. */
  textScale?: number;
}

/**
 * A real shaped control — cut-corner panel, hover/press states, a proper
 * hit area — not bare interactive text (art-direction reset §6).
 */
export class PixelButton extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly label: PixelLabel;
  private readonly btnWidth: number;
  private readonly btnHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: PixelButtonOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    this.btnWidth = opts.width;
    this.btnHeight = opts.height;

    this.panel = scene.add.graphics();
    this.add(this.panel);

    this.label = new PixelLabel(scene, 0, 0, text, {
      color: hexToCss(PALETTE.cyan),
      scale: opts.textScale ?? 2,
      strokeColor: hexToCss(PALETTE.outline),
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    const hitZone = scene.add
      .zone(0, 0, this.btnWidth, this.btnHeight)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.add(hitZone);

    hitZone.on('pointerover', () => this.redraw(true, false));
    hitZone.on('pointerout', () => this.redraw(false, false));
    hitZone.on('pointerdown', () => this.redraw(true, true));
    hitZone.on('pointerup', () => {
      this.redraw(true, false);
      opts.onClick();
    });

    this.redraw(false, false);
  }

  /** Updates the button's text in place — for toggle rows (e.g. "Particles: On" / "Particles: Off") that don't need a whole new button. */
  setLabelText(text: string): void {
    this.label.setPixelText(text);
  }

  private redraw(hover: boolean, press: boolean): void {
    const g = this.panel;
    const w = this.btnWidth;
    const h = this.btnHeight;
    const cut = 5;
    const offsetY = press ? 1 : 0;
    const strokeColor = press ? PALETTE.white : hover ? PALETTE.cyan : PALETTE.cyanDim;
    const fillAlpha = hover ? 0.5 : 0.28;

    g.clear();
    g.fillStyle(PALETTE.metalMid, fillAlpha);
    g.lineStyle(1, strokeColor, 1);

    const x0 = -w / 2;
    const y0 = -h / 2 + offsetY;
    const x1 = w / 2;
    const y1 = h / 2 + offsetY;

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

    this.label.setPosition(0, offsetY);
    this.label.setPixelColor(hexToCss(press ? PALETTE.white : PALETTE.cyan));
  }
}
