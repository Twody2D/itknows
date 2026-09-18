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
  /** Re-sets the type size in virtual px — for a label whose text is replaced live and has to be re-fitted to its box. */
  setSizePx(px: number): void;
  setPosition(vx: number, vy: number): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

/** One CSS border: width in *virtual* px and a colour, or `transparent` for the triangle trick. */
export type BorderSide = readonly [widthPx: number, color: string];

export interface ShapeSpec {
  vw: number;
  vh: number;
  background?: string;
  border?: string;
  borderWidthPx?: number;
  radius?: number;
  glow?: string;
  /** Clockwise rotation in degrees, applied about the shape's own centre. */
  rotate?: number;
  /**
   * Individual borders, for the two shapes the mockup builds out of them: a
   * tick is a box with only its left and bottom borders drawn and rotated
   * -45°, and a triangle is a zero-sized box whose remaining borders are
   * transparent.
   */
  sides?: { top?: BorderSide; right?: BorderSide; bottom?: BorderSide; left?: BorderSide };
}

interface Item {
  el: HTMLDivElement;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  opts: DomTextOptions;
  shape?: ShapeSpec;
  /**
   * Whether the caller wants this element on screen.
   *
   * It has to be remembered rather than read back off `el.style.display`,
   * because `applyStyle` rewrites that property from scratch — it is the
   * one place that decides between `inline-block`, `block` and `-webkit-box`
   * — and it runs again on every restyle and every window resize. Without
   * this flag a hidden element came back the moment anything touched it:
   * the "all clear" button's play triangle is hidden when there is no next
   * sector, and hovering the button recoloured its icon, which restyled the
   * triangle, which un-hid it straight over the button's real icon.
   */
  visible: boolean;
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
    const item: Item = { el, vx, vy, originX, originY, opts: this.fitted(text, opts), visible: true };
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
        // Re-fitted as well as re-texted: the size that kept the previous
        // string's longest word whole says nothing about this one's.
        if (opts.wordWrapWidth !== undefined) {
          item.opts = this.fitted(value, opts);
          this.applyStyle(item);
        }
        reposition();
      },
      setSizePx: (px: number) => {
        item.opts = { ...item.opts, sizePx: px };
        this.applyStyle(item);
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
        item.visible = visible;
        this.applyStyle(item);
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
    style: Omit<ShapeSpec, 'vw' | 'vh'>,
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
      visible: true,
    };
    this.applyStyle(item);
    this.layer.appendChild(el);
    this.items.push(item);
    this.positionItem(item);

    const reposition = (): void => this.positionItem(item);
    const restyle = (): void => this.applyStyle(item);
    return {
      get width() {
        return vw;
      },
      get height() {
        return vh;
      },
      setText: () => undefined,
      setSizePx: () => undefined,
      // Which property carries the colour depends on how the shape is built,
      // and guessing wrong is visible: painting `background` on the triangle
      // (a zero-sized box whose top and bottom borders are transparent) fills
      // the border box straight through those transparent borders, so the
      // play arrow turned into a solid square the moment the button was
      // hovered and its icon recoloured.
      setColor: (color: string) => {
        const spec = item.shape as ShapeSpec;
        if (spec.sides) {
          const sides = spec.sides;
          for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
            const side = sides[edge];
            // A `transparent` side is structural — it is what gives the
            // triangle its slanted edges — so it keeps its colour.
            if (side && side[1] !== 'transparent') sides[edge] = [side[0], color];
          }
        } else if (spec.border !== undefined) {
          spec.border = color;
        } else {
          spec.background = color;
        }
        restyle();
      },
      setPosition: (nx: number, ny: number) => {
        item.vx = nx;
        item.vy = ny;
        reposition();
      },
      setVisible: (visible: boolean) => {
        item.visible = visible;
        this.applyStyle(item);
      },
      destroy: () => {
        el.remove();
        this.items = this.items.filter((i) => i !== item);
      },
    };
  }

  /**
   * The largest size up to `max` at which every *word* of `text` fits
   * `wrapWidth` on its own, measured rather than estimated.
   *
   * `overflow-wrap: break-word` is the browser's last resort: when a single
   * word cannot fit its line at any break point, it is split mid-word. That
   * is correct as a safety net and wrong as a layout, and it is what turned
   * SYSTEM's column into "ПОНРАВИТЬС / Я." — the wrap width was simply
   * narrower than the longest word in the line at the size it was set in.
   * Sizing the type to the longest word removes the condition instead of
   * papering over it; the safety net stays in place underneath.
   */
  /**
   * The requested options with `sizePx` reduced — by at most 40% — to
   * whatever keeps every word of `text` whole inside `wordWrapWidth`.
   *
   * Applied to every wrapped label there is, rather than opted into case by
   * case: a word too wide for its box is split mid-word by the browser as a
   * last resort, and one Russian word long enough to trigger it turns up in
   * a different corner of the UI every round ("ПОНРАВИТЬС / Я.",
   * "НЕЗАВЕРШЕ / НО."). Shrinking removes the condition; the floor keeps a
   * pathological box from shrinking a line into invisibility, and the
   * browser's own break stays underneath as the last resort it is.
   */
  private fitted(text: string, opts: DomTextOptions): DomTextOptions {
    if (opts.wordWrapWidth === undefined) return opts;
    const max = Math.max(6, Math.round(opts.sizePx ?? BASE_SIZE * (opts.scale ?? 1)));
    const sizePx = this.wordFitSize(text, opts, opts.wordWrapWidth, max, Math.max(6, Math.round(max * 0.6)));
    return sizePx === max ? opts : { ...opts, sizePx };
  }

  wordFitSize(text: string, style: DomTextOptions, wrapWidth: number, max: number, min = 7): number {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0 || wrapWidth <= 0) return max;
    // Longest by character count first, then really measured: glyph widths
    // differ, so the longest string is not always the widest, but it is a
    // reliable shortlist and keeps this to a few probes.
    const longest = [...words].sort((a, b) => b.length - a.length).slice(0, 3);
    // A probe must be free to take its natural width: left wrapping (or
    // clamped), it would measure the box it is being fitted to rather than
    // the word.
    const free = { ...style, color: 'transparent', sizePx: max };
    delete free.wordWrapWidth;
    delete free.clampLines;
    let widest = 0;
    for (const word of longest) {
      const probe = this.add(-1000, -1000, word, free, 0, 0);
      widest = Math.max(widest, probe.width);
      probe.destroy();
    }
    if (widest <= 0 || widest <= wrapWidth) return max;
    return Math.max(min, Math.floor((max * wrapWidth) / widest));
  }

  /**
   * The largest size up to `max` at which the whole of `text` fits `maxWidth`
   * on ONE line, measured rather than estimated.
   *
   * The sibling above sizes to the longest *word*, which is what a wrapped
   * block needs — its lines break anywhere, so only a word too wide to break
   * is a problem. A single-line label has no breaks to hide behind: what it
   * collides with is whatever sits beside it, and the number that decides
   * that is the width of the entire string. The level map's sector title had
   * neither measurement and simply ran into the progress bar
   * (`LevelSelectScene.buildSectorHeader`).
   */
  lineFitSize(text: string, style: DomTextOptions, maxWidth: number, max: number, min = 7): number {
    if (maxWidth <= 0 || text.trim().length === 0) return max;
    const width = this.measureWidth(text, { ...style, sizePx: max });
    if (width <= 0 || width <= maxWidth) return max;
    return Math.max(min, Math.floor((max * maxWidth) / width));
  }

  /**
   * The natural width in virtual px of `text` set in `style`, measured by
   * rendering it off-screen rather than estimated from character counts —
   * glyph widths differ, and this font's do not follow character count.
   *
   * A caller that needs to reserve room for a label (rather than shrink one
   * to fit) has no other honest way to ask: the label does not exist yet.
   */
  measureWidth(text: string, style: DomTextOptions): number {
    if (text.length === 0) return 0;
    // Wrapping (or clamping) would make the probe report the box it is being
    // fitted to instead of the text's own width.
    const free = { ...style, color: 'transparent' };
    delete free.wordWrapWidth;
    delete free.clampLines;
    const probe = this.add(-1000, -1000, text, free, 0, 0);
    const width = probe.width;
    probe.destroy();
    return width;
  }

  /**
   * Fades the whole layer up from nothing, once, for a screen whose canvas
   * blocks animate in: the labels live outside the display list, so a Phaser
   * tween cannot reach them, and without this they would pop in fully lit
   * over panels that are still arriving.
   */
  fadeInLayer(durationMs: number): void {
    this.layer.style.opacity = '0';
    this.layer.style.transition = `opacity ${durationMs}ms ease-out`;
    requestAnimationFrame(() => {
      this.layer.style.opacity = '1';
    });
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

    // Hidden wins over everything below: this method is the only writer of
    // `display`, so it has to honour the caller's own visibility (see
    // `Item.visible`) instead of quietly restoring the element.
    if (!item.visible) {
      el.style.display = 'none';
      return;
    }

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
      if (s.sides) {
        const side = (spec: BorderSide | undefined): string => (spec ? `${spec[0] * scaleY}px solid ${spec[1]}` : '0');
        el.style.borderTop = side(s.sides.top);
        el.style.borderRight = side(s.sides.right);
        el.style.borderBottom = side(s.sides.bottom);
        el.style.borderLeft = side(s.sides.left);
      }
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
    const spin = item.shape?.rotate === undefined ? '' : ` rotate(${item.shape.rotate}deg)`;
    item.el.style.transform = `translate(${-item.originX * 100}%, ${-item.originY * 100}%)${spin}`;
  }

  private reposition(): void {
    for (const item of this.items) {
      this.applyStyle(item);
      this.positionItem(item);
    }
  }
}
