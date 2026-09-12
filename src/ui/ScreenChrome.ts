import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { playSfx } from '@/audio/SfxManager';
import type { DomTextOverlay } from './DomTextOverlay';
import { addChevronGlyph } from './glyphs';

/**
 * The chrome every full-screen overlay in the Claude Design mockups shares
 * (rounds 4d/4f/4g): a 28px top bar with a chevron on the left, and 20px
 * section bands with a 3px bar in the section's own color. Kept here rather
 * than copied into each scene so the three screens can't drift apart the way
 * the old panel-and-button versions did.
 */
export const SCREEN_TOPBAR_H = 28;

export interface ScreenTopbarOptions {
  title: string;
  subtitle?: string;
  /** Right-aligned technical token (version, counter) — never something the player must read. */
  right?: string;
  rightColor?: number;
  accent: number;
  onBack: () => void;
}

export function buildScreenTopbar(scene: Phaser.Scene, domText: DomTextOverlay, opts: ScreenTopbarOptions): void {
  const { width } = scene.scale;

  const bg = scene.add.graphics();
  bg.fillStyle(PALETTE.bgIndigo, 1);
  bg.fillRect(0, 0, width, SCREEN_TOPBAR_H);
  bg.fillStyle(opts.accent, 0.6);
  bg.fillRect(0, SCREEN_TOPBAR_H - 1, width, 1);

  const chev = scene.add.graphics();
  // The arrow itself is a DOM glyph: the box around it is axis-aligned and
  // survives the canvas upscale, the diagonal inside it does not.
  const arrow = addChevronGlyph(domText, 18, 14, 11, hexToCss(PALETTE.cyan));
  const paintBack = (hover: boolean): void => {
    chev.clear();
    chev.fillStyle(hover ? PALETTE.panelHover : PALETTE.metalMid, 1);
    chev.lineStyle(1, hover ? PALETTE.cyan : PALETTE.metalEdge, 1);
    chev.fillRect(8, 4, 20, 20);
    chev.strokeRect(8, 4, 20, 20);
    arrow.setColor(hexToCss(hover ? PALETTE.white : PALETTE.cyan));
  };
  paintBack(false);

  const zone = scene.add.zone(18, 14, 32, 28).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => paintBack(true));
  zone.on('pointerout', () => paintBack(false));
  zone.on('pointerup', () => {
    playSfx('uiClick');
    opts.onBack();
  });

  const title = domText.add(
    36,
    14,
    opts.title,
    { color: hexToCss(PALETTE.white), font: 'pixel', sizePx: 19, letterSpacing: 2, uppercase: true },
    0,
    0.5,
  );

  // Built before the subtitle so the subtitle can be measured against the
  // space this actually leaves. The mockup pins both to fixed x (subtitle
  // 150, counter 352) because it is drawn at one fixed 620px width; ours
  // has to hold from 480 to 620, so the gap is computed instead of assumed.
  let rightEdge = width - 10;
  if (opts.right !== undefined) {
    const right = domText.add(
      width - 10,
      15,
      opts.right,
      { color: hexToCss(opts.rightColor ?? PALETTE.systemMuted), font: 'pixel', sizePx: 10, letterSpacing: 1, uppercase: true },
      1,
      0.5,
    );
    rightEdge = width - 10 - right.width;
  }

  // The subtitle is the first thing to go on a narrow canvas — it explains,
  // it never instructs, so losing it costs the player nothing. It is never
  // allowed to reach the counter: that is a fact about the player's own
  // progress, and a decorative caption must not sit on top of it.
  if (opts.subtitle === undefined) return;
  const subtitleX = 40 + title.width;
  const available = rightEdge - 10 - subtitleX;
  if (available < 48) return;
  domText.add(
    subtitleX,
    15,
    opts.subtitle,
    {
      color: hexToCss(PALETTE.labelMuted),
      font: 'pixel',
      sizePx: 10,
      letterSpacing: 1,
      uppercase: true,
      wordWrapWidth: available,
      clampLines: 1,
    },
    0,
    0.5,
  );
}

/** A section header band: 20px tall, a 3px bar in `accent`, an optional right-aligned note. */
export function buildSectionBand(
  scene: Phaser.Scene,
  domText: DomTextOverlay,
  x: number,
  y: number,
  w: number,
  label: string,
  accent: number,
  fill: number,
  rightLabel?: string,
): void {
  const g = scene.add.graphics();
  g.fillStyle(fill, 0.35);
  g.fillRect(x, y, w, 20);
  g.fillStyle(accent, 1);
  g.fillRect(x, y, 3, 20);

  domText.add(
    x + 11,
    y + 10,
    label,
    { color: hexToCss(accent), font: 'pixel', sizePx: 11, letterSpacing: 1, uppercase: true },
    0,
    0.5,
  );

  if (rightLabel === undefined) return;
  domText.add(
    x + w - 8,
    y + 10,
    rightLabel,
    { color: hexToCss(PALETTE.labelMuted), font: 'pixel', sizePx: 9, letterSpacing: 1, uppercase: true },
    1,
    0.5,
  );
}

/**
 * ESC closes any overlay screen, matching what the chevron does. Bound per
 * scene and released on shutdown, so a stack of overlays can't leave a dead
 * handler behind that closes the wrong screen later.
 */
export function attachEscape(scene: Phaser.Scene, onEscape: () => void): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  const handler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    onEscape();
  };
  keyboard.on('keydown', handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard.off('keydown', handler));
}
