import Phaser from 'phaser';
import { drawLines, measureLines, wrapText } from '@/art/font/BitmapFont';

let uid = 0;

export interface PixelLabelOptions {
  color: string;
  scale?: number;
  strokeColor?: string;
  /** Max width in *screen* px (already includes `scale`) before wrapping to a new line. */
  wordWrapWidth?: number;
}

/**
 * `Phaser.GameObjects.Text`-shaped replacement backed by the project's own
 * bitmap font (`art/font`) instead of the system/browser monospace stack —
 * the art-direction reset explicitly rejects rendering UI copy through the
 * OS font. Because the glyphs are hard, unaliased pixels to begin with,
 * they stay crisp when `pixelArt`'s nearest-neighbour upscale blows the
 * whole canvas up — unlike anti-aliased system-font text, which is what
 * made the DOM-overlay workaround (superseded by this) necessary. A real
 * `Image` GameObject also means `setOrigin`/`setScrollFactor`/`setDepth`/
 * `alpha`/tweens/`setInteractive` all just work — no shimming needed.
 */
export class PixelLabel extends Phaser.GameObjects.Image {
  private content: string;
  private opts: PixelLabelOptions;
  private textureKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: PixelLabelOptions) {
    const key = `pixel-label-${uid++}`;
    PixelLabel.buildTexture(scene, key, text, opts);

    super(scene, x, y, key);
    this.content = text;
    this.opts = opts;
    this.textureKey = key;

    scene.add.existing(this);
    this.setOrigin(0, 0);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (scene.textures.exists(this.textureKey)) scene.textures.remove(this.textureKey);
    });
  }

  get pixelText(): string {
    return this.content;
  }

  setPixelText(value: string): this {
    if (this.content === value) return this;
    this.content = value;
    this.rebuild();
    return this;
  }

  setPixelColor(color: string): this {
    this.opts = { ...this.opts, color };
    this.rebuild();
    return this;
  }

  private rebuild(): void {
    const oldKey = this.textureKey;
    this.textureKey = `pixel-label-${uid++}`;
    PixelLabel.buildTexture(this.scene, this.textureKey, this.content, this.opts);
    this.setTexture(this.textureKey);
    if (this.scene.textures.exists(oldKey)) this.scene.textures.remove(oldKey);
  }

  private static buildTexture(scene: Phaser.Scene, key: string, text: string, opts: PixelLabelOptions): void {
    const scale = opts.scale ?? 1;
    const lines = opts.wordWrapWidth ? wrapText(text, opts.wordWrapWidth / scale) : [text.toUpperCase()];
    const pad = opts.strokeColor ? scale : 0;
    const { width, height } = measureLines(lines);
    const w = Math.max(1, Math.round(width * scale) + pad * 2);
    const h = Math.max(1, Math.round(height * scale) + pad * 2);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    if (opts.strokeColor) {
      // A drop shadow down-right, not a full outline ring. Ringing every
      // glyph in black doubled its apparent weight and hard-edged every
      // curve — text read as stamped rather than lit. One offset pass keeps
      // the contrast that makes copy legible over the level behind it while
      // leaving the letterform itself intact.
      ctx.globalAlpha = 0.75;
      drawLines(ctx, lines, pad + scale, pad + scale, opts.strokeColor, scale);
      ctx.globalAlpha = 1;
    }
    drawLines(ctx, lines, pad, pad, opts.color, scale);

    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  }
}
