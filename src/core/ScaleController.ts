import Phaser from 'phaser';
import { MAX_VIRTUAL_WIDTH, MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';

/**
 * Keeps the internal resolution at a fixed VIRTUAL_HEIGHT with a floating
 * width (CLAUDE.md #2), then scales the canvas to the viewport with square
 * pixels. A wide screen sees more of the level horizontally; it never sees a
 * stretched image.
 *
 * The scale factor is deliberately fractional, not an integer step. Integer
 * zoom leaves whatever doesn't divide evenly as a blank margin, which is what
 * used to read as "the game is small" / "there's a black bar." Fractional
 * scale plus `image-rendering: pixelated` (index.html) fills the viewport and
 * still resolves every source pixel as a hard-edged block.
 */
export class ScaleController {
  constructor(private game: Phaser.Game) {
    this.apply();
    window.addEventListener('resize', () => this.apply());
    window.addEventListener('orientationchange', () => this.apply());
  }

  private apply(): void {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Fill the height, but never so much that fewer than MIN_VIRTUAL_WIDTH
    // virtual pixels fit across — levels are authored against that width, so
    // dropping below it would cut off gameplay rather than just show less
    // scenery.
    const scale = Math.min(viewportH / VIRTUAL_HEIGHT, viewportW / MIN_VIRTUAL_WIDTH);
    const width = Phaser.Math.Clamp(Math.round(viewportW / scale), MIN_VIRTUAL_WIDTH, MAX_VIRTUAL_WIDTH);

    this.game.scale.resize(width, VIRTUAL_HEIGHT);

    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.width = `${Math.round(width * scale)}px`;
      canvas.style.height = `${Math.round(VIRTUAL_HEIGHT * scale)}px`;
      // Pointer coordinates are derived from the canvas' CSS box, which was
      // just resized behind the ScaleManager's back.
      this.game.scale.updateBounds();
    }
  }
}
