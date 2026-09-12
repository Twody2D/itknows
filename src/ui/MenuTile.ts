import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { playSfx } from '@/audio/SfxManager';
import { MenuIcon, type MenuIconKind } from './MenuIcons';

export type MenuTileVariant = 'primary' | 'secondary' | 'compact';

export interface MenuTileLabelState {
  hover: boolean;
  press: boolean;
  /** PALETTE hex the label should take for this state. */
  color: number;
  /** Press nudge, for the caller to apply to its own label so text sinks with the face. */
  offsetY: number;
  /** PALETTE hex the pictogram should take — reported for the same reason as `color`: a diagonal icon is drawn on the DOM layer, not into the canvas. */
  iconColor: number;
}

export interface MenuTileOptions {
  /** Top-left corner, matching how the design spec tabulates every element. */
  x: number;
  y: number;
  width: number;
  height: number;
  variant: MenuTileVariant;
  icon: MenuIconKind;
  /** Idle border colour — deliberately the dim end of the channel, so the frame never competes with the icon. */
  accent: number;
  /** Border colour on hover — the same channel at full strength. */
  hoverAccent: number;
  /**
   * Icon colour, separate from the border on purpose: the border is
   * structure and stays quiet, the pictogram is the thing that has to be
   * spotted from across the screen, so it carries the meaning colour at full
   * strength from the start (gold = money, violet = help, cyan = go).
   */
  iconAccent: number;
  onClick: () => void;
  /** The label lives outside the canvas (`DomTextOverlay`), so the tile reports what it would have drawn. */
  onLabelState: (state: MenuTileLabelState) => void;
  /**
   * Width of icon+gap+label together. Given only for `compact`, whose content
   * is centred rather than left-aligned — the caller measures its DOM label
   * first, since the canvas can't.
   */
  contentWidth?: number;
}

/**
 * Per-variant metrics straight from the design spec's layout table. The
 * `hitPad` pair is the spec's invisible touch target (240x68 for PLAY,
 * 120x52 for the grid) expressed as padding per side — it has to stay this
 * small vertically, since the 2x2 grid's rows are only 8px apart and a
 * fatter pad would make the two rows' hit zones overlap.
 */
const METRICS = {
  primary: { padLeft: 22, iconBox: 22, gap: 16, sole: 4, press: 3, hitPadX: 5, hitPadY: 4 },
  secondary: { padLeft: 8, iconBox: 18, gap: 6, sole: 2, press: 2, hitPadX: 0, hitPadY: 3 },
  compact: { padLeft: 8, iconBox: 8, gap: 5, sole: 2, press: 2, hitPadX: 0, hitPadY: 3 },
} as const;

/**
 * The main menu's button: a lit face sitting on a darker "sole" that vanishes
 * when you press it, so the control physically sinks under the finger.
 *
 * Deliberately a separate control from `PixelButton` rather than a third
 * variant of it. `PixelButton` is a chamfered, bracketed panel with a hover
 * underline — that vocabulary is on every other screen and stays there. This
 * one is square, gradient-faced and icon-led, and only the menu uses it.
 *
 * The label is not drawn here. Russian button copy in the project's blocky
 * bitmap font lands at 5-7px glyphs on a 270px-tall canvas, where НАСТРОЙКИ
 * and КАК ИГРАТЬ blur into each other, so menu labels are real DOM text in
 * the OS sans (`DomTextOverlay`) and the tile reports its state outward via
 * `onLabelState` — the same split `PixelButton.hideLabel` already uses.
 */
export class MenuTile extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly icon: MenuIcon;
  private readonly opts: MenuTileOptions;
  private readonly metrics: (typeof METRICS)[MenuTileVariant];
  /**
   * Suppresses `onLabelState` for the constructor's own first redraw. The
   * callback all but always closes over the tile being constructed, and
   * firing it from in here would reach that binding inside its temporal dead
   * zone. The initial state is plain idle anyway, which is exactly what the
   * caller sets up when it positions the label immediately afterwards.
   */
  private ready = false;
  /** Where the caller should put its DOM label: left edge, vertical centre. */
  readonly labelX: number;
  readonly labelY: number;
  /** Centre of the pictogram box, for an icon the caller draws on the DOM layer (see `DIAGONAL_ICONS`). */
  readonly iconX: number;
  readonly iconY: number;

  constructor(scene: Phaser.Scene, opts: MenuTileOptions) {
    super(scene, opts.x, opts.y);
    scene.add.existing(this);

    this.opts = opts;
    this.metrics = METRICS[opts.variant];

    this.face = scene.add.graphics();
    this.add(this.face);

    const m = this.metrics;
    const contentLeft =
      opts.contentWidth !== undefined ? Math.round((opts.width - opts.contentWidth) / 2) : m.padLeft;
    const iconCx = contentLeft + m.iconBox / 2;
    const centerY = opts.height / 2;

    this.icon = new MenuIcon(scene, iconCx, centerY, opts.icon, this.iconColor(false, false));
    this.add(this.icon);

    this.labelX = opts.x + contentLeft + m.iconBox + m.gap;
    this.labelY = opts.y + centerY;
    this.iconX = opts.x + iconCx;
    this.iconY = opts.y + centerY;

    const hit = scene.add
      .zone(opts.width / 2, centerY, opts.width + m.hitPadX * 2, opts.height + m.hitPadY * 2)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.add(hit);

    hit.on('pointerover', () => this.redraw(true, false));
    hit.on('pointerout', () => this.redraw(false, false));
    hit.on('pointerdown', () => this.redraw(true, true));
    hit.on('pointerup', () => {
      this.redraw(true, false);
      playSfx('uiClick');
      opts.onClick();
    });

    this.redraw(false, false);
    this.ready = true;
  }

  private iconColor(hover: boolean, press: boolean): number {
    if (this.opts.variant === 'primary') return PALETTE.bgVoid;
    if (press) return PALETTE.cyanDim;
    // Hover lifts the icon to white rather than to a lighter tint of its own
    // hue — the border and fill already shifted within the channel, so white
    // is the one step that still reads as a change against any of them.
    return hover ? PALETTE.white : this.opts.iconAccent;
  }

  private redraw(hover: boolean, press: boolean): void {
    const g = this.face;
    const { width: w, height: h, variant } = this.opts;
    const m = this.metrics;
    const offsetY = press ? m.press : 0;

    g.clear();

    if (variant === 'primary') {
      // Pressing removes the sole entirely — the face lands on the surface
      // it was standing on, which is what sells the push.
      if (!press) {
        g.fillStyle(hover ? PALETTE.cyanSoleHover : PALETTE.cyanDim, 1);
        g.fillRect(0, h, w, m.sole);
      }

      const top = press ? PALETTE.cyan : hover ? PALETTE.cyanGlow : PALETTE.cyanBright;
      const bottom = press ? PALETTE.cyanPress : hover ? PALETTE.cyanBright : PALETTE.cyan;
      g.fillGradientStyle(top, top, bottom, bottom, 1);
      g.fillRect(0, offsetY, w, h);

      g.lineStyle(2, press ? PALETTE.cyanEdge : PALETTE.white, 1);
      g.strokeRect(1, offsetY + 1, w - 2, h - 2);
    } else {
      if (!press) {
        g.fillStyle(hover ? PALETTE.cyanDim : PALETTE.metalDark, 1);
        g.fillRect(0, h, w, m.sole);
      }

      g.fillStyle(press ? PALETTE.metalDark : hover ? PALETTE.panelHover : PALETTE.metalMid, 1);
      g.fillRect(0, offsetY, w, h);

      const border = press ? PALETTE.cyanDim : hover ? this.opts.hoverAccent : this.opts.accent;
      g.lineStyle(1, border, 1);
      g.strokeRect(0.5, offsetY + 0.5, w - 1, h - 1);
    }

    this.icon.setPosition(this.icon.x, this.opts.height / 2 + offsetY);
    this.icon.setAccent(this.iconColor(hover, press));

    if (!this.ready) return;
    const labelColor =
      variant === 'primary' ? PALETTE.bgVoid : press ? PALETTE.textMuted : PALETTE.white;
    this.opts.onLabelState({ hover, press, color: labelColor, offsetY, iconColor: this.iconColor(hover, press) });
  }
}
