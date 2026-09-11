import Phaser from 'phaser';
import { PIXEL_FONT, PIXEL_WEIGHT, PROSE_FONT, PROSE_WEIGHT } from './fonts';

export interface DomTextOptions {
  color: string;
  /**
   * Which of the two UI typefaces to set the label in: `pixel` (titles,
   * counters, prices, SYSTEM's voice) or `prose` (descriptions, item names,
   * button labels). Defaults to `prose`.
   */
  font?: 'pixel' | 'prose';
  /** Letter spacing in *virtual* px — the mockup gives its pixel-font labels 1-2px. */
  letterSpacing?: number;
  /** Line box as a multiple of the font size. Defaults to 1.3 (1.5 for the mockup's SYSTEM column). */
  lineHeight?: number;
  scale?: number;
  /** Type size in *virtual* px, taken literally. Overrides `scale`, for a design spec that names a size (13px) rather than a multiple of `BASE_SIZE`. */
  sizePx?: number;
  strokeColor?: string;
  /** Max width in *virtual* px before the browser wraps to a new line. */
  wordWrapWidth?: number;
  bold?: boolean;
  /** Uppercases visually only — so the i18n dictionary keeps ordinary sentence case ("Играть") and stays reusable by screens that don't shout. */
  uppercase?: boolean;
  /** Hard-clips to this many lines (CSS line-clamp) instead of letting a long description grow the box — for a fixed-height legend slot (shop showroom card/detail panel) where overflow must never push a sibling element down. */
  clampLines?: number;
}

export interface DomTextHandle {
  readonly width: number;
  readonly height: number;
  setText(text: string): void;
  setColor(color: string): void;
  setPosition(vx: number, vy: number): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

interface ShapeSpec {
  vw: number;
  vh: number;
  background?: string;
  border?: string;
  borderWidthPx?: number;
  radius?: number;
  glow?: string;
}

interface Item {
  el: HTMLDivElement;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  opts: DomTextOptions;
  shape?: ShapeSpec;
}

const BASE_SIZE = 9;

/**
 * Real, browser-rendered text positioned over the game canvas — used only by
 * `ShopScene` (project owner's explicit call: everywhere else keeps the
 * game's bitmap font). This sidesteps a whole category of problem a canvas
 * texture can't escape: the game renders everything into a small fixed
 * virtual resolution (`VIRTUAL_HEIGHT` = 270px) and blows it up with
 * `image-rendering: pixelated` so the hand-authored pixel art stays crisp —
 * but that same nearest-neighbour upscale turns *any* small antialiased
 * glyph into either a blurry smear (soft edges) or jagged stair-steps (hard
 * edges), because a proportional OS font was never drawn pixel-by-pixel for
 * this resolution the way the bitmap font was. Real DOM text is painted by
 * the browser at native screen resolution, after the canvas's own upscale
 * step, so none of that applies to it.
 */
export class DomTextOverlay {
  private layer: HTMLDivElement;
  private items: Item[] = [];
  private resizeHandler = (): void => this.reposition();

  constructor(
    private scene: Phaser.Scene,
    /**
     * Stacking order between overlays. Scenes run in parallel in Phaser, so
     * two scenes can each own a layer at once — the menu's has to sit below
     * an overlay screen's (see `MainMenuScene.openOverlay`, which also hides
     * it outright, since a dim backdrop drawn into the canvas can't cover
     * DOM text).
     */
    zIndex = 20,
  ) {
    this.layer = document.createElement('div');
    Object.assign(this.layer.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      // A real viewport-sized containing block, not 0×0 — an absolutely
      // positioned child with `width:auto` shrink-to-fits against its
      // containing block's width (CSS2.1 §10.3.7), so a 0-wide ancestor
      // starves every child down to its minimum intrinsic width, which for
      // wrappable text is roughly one character. That's what turned every
      // label into a single vertical column of letters.
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: String(zIndex),
    });
    document.body.appendChild(this.layer);

    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('orientationchange', this.resizeHandler);
  }

  /** `originX`/`originY` (0..1) work like `PixelLabel.setOrigin` — 0.5,0.5 centers on (vx,vy); 0,0 grows right/down from it. */
  add(vx: number, vy: number, text: string, opts: DomTextOptions, originX = 0, originY = 0): DomTextHandle {
    const el = document.createElement('div');
    const item: Item = { el, vx, vy, originX, originY, opts };
    this.applyStyle(item);
    el.textContent = text;
    this.layer.appendChild(el);
    this.items.push(item);
    this.positionItem(item);

    // Arrow functions (not `this`-aliasing) so the closures below resolve
    // `this` lexically to this `DomTextOverlay` instance.
    const getScale = (): { scaleX: number; scaleY: number } => this.currentScale();
    const reposition = (): void => this.positionItem(item);

    const handle: DomTextHandle = {
      get width() {
        return el.getBoundingClientRect().width / getScale().scaleX;
      },
      get height() {
        return el.getBoundingClientRect().height / getScale().scaleY;
      },
      setText: (value: string) => {
        el.textContent = value;
        reposition();
      },
      setColor: (color: string) => {
        item.opts = { ...item.opts, color };
        el.style.color = color;
      },
      setPosition: (nx: number, ny: number) => {
        item.vx = nx;
        item.vy = ny;
        reposition();
      },
      setVisible: (visible: boolean) => {
        el.style.display = visible ? 'inline-block' : 'none';
      },
      destroy: () => {
        el.remove();
        this.items = this.items.filter((i) => i !== item);
      },
    };
    return handle;
  }

  /**
   * A plain positioned box on the same overlay — used for the mockup's round
   * coins. A 10px circle drawn into the 270px game canvas becomes a visibly
   * square-edged blob once the canvas is upscaled with nearest-neighbour
   * filtering; the same circle as a DOM element is painted by the browser at
   * native screen resolution, exactly like the text beside it.
   */
  addShape(
    vx: number,
    vy: number,
    vw: number,
    vh: number,
    style: { background?: string; border?: string; borderWidthPx?: number; radius?: number; glow?: string },
    originX = 0.5,
    originY = 0.5,
  ): DomTextHandle {
    const el = document.createElement('div');
    const item: Item = {
      el,
      vx,
      vy,
      originX,
      originY,
      opts: { color: 'transparent' },
      shape: { vw, vh, ...style },
    };
    this.applyStyle(item);
    this.layer.appendChild(el);
    this.items.push(item);
    this.positionItem(item);

    const reposition = (): void => this.positionItem(item);
    return {
      get width() {
        return vw;
      },
      get height() {
        return vh;
      },
      setText: () => undefined,
      setColor: (color: string) => {
        el.style.background = color;
      },
      setPosition: (nx: number, ny: number) => {
        item.vx = nx;
        item.vy = ny;
        reposition();
      },
      setVisible: (visible: boolean) => {
        el.style.display = visible ? 'block' : 'none';
      },
      destroy: () => {
        el.remove();
        this.items = this.items.filter((i) => i !== item);
      },
    };
  }

  /**
   * Hides/shows every label at once, without touching each handle's own
   * `setVisible` state — so a caller can black out the whole layer while
   * another scene is on top and restore it afterwards, and whatever was
   * individually hidden stays hidden.
   */
  setLayerVisible(visible: boolean): void {
    this.layer.style.display = visible ? '' : 'none';
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    this.layer.remove();
    this.items = [];
  }

  private currentScale(): { scaleX: number; scaleY: number; rect: DOMRect } {
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.scene.scale.width;
    const scaleY = rect.height / this.scene.scale.height;
    return { scaleX, scaleY, rect };
  }

  private applyStyle(item: Item): void {
    const { el, opts, originX } = item;
    const { scaleY } = this.currentScale();

    if (item.shape) {
      const s = item.shape;
      el.style.position = 'absolute';
      el.style.display = 'block';
      el.style.boxSizing = 'border-box';
      el.style.width = `${s.vw * scaleY}px`;
      el.style.height = `${s.vh * scaleY}px`;
      el.style.background = s.background ?? 'transparent';
      el.style.borderRadius = s.radius === undefined ? '0' : `${s.radius * scaleY}px`;
      el.style.border = s.border ? `${Math.max(1, (s.borderWidthPx ?? 1) * scaleY)}px solid ${s.border}` : '';
      el.style.boxShadow = s.glow ? `0 0 ${6 * scaleY}px ${s.glow}` : '';
      return;
    }
    const virtualPx = Math.max(6, Math.round(opts.sizePx ?? BASE_SIZE * (opts.scale ?? 1)));

    el.style.position = 'absolute';
    el.style.display = 'inline-block';
    el.style.fontFamily = opts.font === 'pixel' ? PIXEL_FONT : PROSE_FONT;
    // Only weights `fonts.ts` actually imports may be named here: an
    // unimported weight is synthesised by smearing the glyph without
    // widening its advance, which makes neighbouring letters overlap.
    const weight = opts.font === 'pixel' ? PIXEL_WEIGHT : PROSE_WEIGHT;
    el.style.fontWeight = opts.bold ? weight.bold : weight.regular;
    el.style.fontSize = `${virtualPx * scaleY}px`;
    el.style.lineHeight = String(opts.lineHeight ?? 1.3);
    const tracking = opts.letterSpacing ?? 0;
    el.style.letterSpacing = tracking ? `${tracking * scaleY}px` : '';
    el.style.color = opts.color;
    el.style.textTransform = opts.uppercase ? 'uppercase' : 'none';
    el.style.textAlign = originX === 0.5 ? 'center' : 'left';
    el.style.whiteSpace = opts.wordWrapWidth ? 'normal' : 'pre';
    // `normal` + `overflow-wrap` breaks *between* words and only splits a
    // word that cannot fit its line at any position. The legacy
    // `word-break: break-word` used to sit here instead, which breaks
    // *inside* words at the first character that overflows — that is what
    // turned SYSTEM's lines into "ИНТЕРЕСН / О," and "ПРИДУМ / АЛИ".
    el.style.wordBreak = 'normal';
    el.style.overflowWrap = 'break-word';
    el.style.maxWidth = opts.wordWrapWidth !== undefined ? `${opts.wordWrapWidth * scaleY}px` : '';

    if (opts.clampLines !== undefined) {
      el.style.display = '-webkit-box';
      el.style.setProperty('-webkit-line-clamp', String(opts.clampLines));
      el.style.setProperty('-webkit-box-orient', 'vertical');
      el.style.overflow = 'hidden';
    } else {
      el.style.overflow = '';
      el.style.removeProperty('-webkit-line-clamp');
      el.style.removeProperty('-webkit-box-orient');
    }

    if (opts.strokeColor) {
      // Only a hard drop shadow, and only once the text is big enough to
      // carry one. A centred `-webkit-text-stroke` used to be set here too:
      // half of a centred stroke lies *inside* the glyph, and at UI sizes the
      // counters of а/о/е/в/я are a couple of pixels across, so the outline
      // closed them up and the letters read as broken. Chrome painted both
      // it and this shadow — the stroke was written as the Blink path and
      // the shadow as a Firefox-only fallback, but Blink honours both —
      // which doubled the damage. The mockups themselves never outline body
      // text; every label there sits on a solid panel, so the separation an
      // outline buys is not needed below display sizes.
      const fontSizeCss = virtualPx * scaleY;
      if (fontSizeCss >= 20) {
        const offset = Math.max(1, Math.round(fontSizeCss * 0.05));
        el.style.textShadow = `${offset}px ${offset}px 0 ${opts.strokeColor}`;
      } else {
        el.style.textShadow = '';
      }
    } else {
      el.style.textShadow = '';
    }
    el.style.removeProperty('-webkit-text-stroke-width');
    el.style.removeProperty('-webkit-text-stroke-color');
  }

  private positionItem(item: Item): void {
    const { scaleX, scaleY, rect } = this.currentScale();
    item.el.style.left = `${rect.left + item.vx * scaleX}px`;
    item.el.style.top = `${rect.top + item.vy * scaleY}px`;
    item.el.style.transform = `translate(${-item.originX * 100}%, ${-item.originY * 100}%)`;
  }

  private reposition(): void {
    for (const item of this.items) {
      this.applyStyle(item);
      this.positionItem(item);
    }
  }
}
