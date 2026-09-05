import Phaser from 'phaser';

export interface DomTextOptions {
  color: string;
  scale?: number;
  strokeColor?: string;
  /** Max width in *virtual* px before the browser wraps to a new line. */
  wordWrapWidth?: number;
  bold?: boolean;
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

interface Item {
  el: HTMLDivElement;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  opts: DomTextOptions;
}

/** CLAUDE.md #3's own sanctioned fallback for "длинные текстовые блоки" — the OS font stack, zero files shipped, zero CDN request. */
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
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

  constructor(private scene: Phaser.Scene) {
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
      zIndex: '20',
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
    const virtualPx = Math.max(6, Math.round(BASE_SIZE * (opts.scale ?? 1)));

    el.style.position = 'absolute';
    el.style.display = 'inline-block';
    el.style.fontFamily = FONT_STACK;
    el.style.fontWeight = opts.bold ? '700' : '600';
    el.style.fontSize = `${virtualPx * scaleY}px`;
    el.style.lineHeight = '1.3';
    el.style.color = opts.color;
    el.style.textAlign = originX === 0.5 ? 'center' : 'left';
    el.style.whiteSpace = opts.wordWrapWidth ? 'normal' : 'pre';
    el.style.wordBreak = 'break-word';
    el.style.maxWidth = opts.wordWrapWidth !== undefined ? `${opts.wordWrapWidth * scaleY}px` : '';

    if (opts.strokeColor) {
      // A thin hairline relative to the *rendered* font size, not the small
      // virtual-px value scaled up blindly — a real sans-serif glyph's own
      // stroke is much thinner than the bitmap font's blocky one, so the
      // same "1 virtual px, scaled" outline the bitmap font uses came out
      // thick enough here to swallow the fill color entirely (read as solid
      // black). ~4% of font size reads as a crisp edge instead.
      const fontSizeCss = virtualPx * scaleY;
      const strokeW = Math.max(1, fontSizeCss * 0.045);
      el.style.setProperty('-webkit-text-stroke-width', `${strokeW}px`);
      el.style.setProperty('-webkit-text-stroke-color', opts.strokeColor);
      // Firefox (no `-webkit-text-stroke` support) falls back to a lighter
      // single-offset drop shadow — same treatment `PixelLabel` uses, not a
      // full ring, so it doesn't stack with the webkit outline in Blink.
      el.style.textShadow = `${strokeW}px ${strokeW}px 0 ${opts.strokeColor}`;
    } else {
      el.style.removeProperty('-webkit-text-stroke-width');
      el.style.textShadow = '';
    }
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
