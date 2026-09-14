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
 *
 * ON A SCREEN NARROWER THAN 16:9 THERE IS A HORIZONTAL BAND ABOVE AND BELOW,
 * and it is the lesser of two evils rather than an oversight. CLAUDE.md #2
 * forbids vertical letterboxing, but it also fixes the height at 270 and
 * requires that nothing gameplay-critical needs more than MIN_VIRTUAL_WIDTH
 * across. On a 4:3 tablet (1024x768) filling the height would leave 360
 * virtual pixels across — 120 columns of the level simply not on screen.
 * So the width wins, the canvas is centred, and the bands take the
 * page background (`index.html`, the same `#05050a` the game's own void is
 * painted in) rather than reading as black bars. Measured: 192px of band at
 * 1024x768, 156px at 1180x820, none at 16:9 or wider.
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
      // Floor, and never past the viewport. `width` is itself rounded, so
      // `round(width * scale)` can land a pixel PAST the viewport it was
      // derived from — measured at 812x375 (canvas 813px) and at 892x412
      // (canvas 893px), which cropped the rightmost column of the level.
      // A pixel short is invisible; a pixel over is a pixel of the game
      // nobody can see.
      canvas.style.width = `${Math.min(Math.floor(width * scale), viewportW)}px`;
      canvas.style.height = `${Math.min(Math.floor(VIRTUAL_HEIGHT * scale), viewportH)}px`;
      // Pointer coordinates are derived from the canvas' CSS box, which was
      // just resized behind the ScaleManager's back.
      this.game.scale.updateBounds();
    }
  }
}
