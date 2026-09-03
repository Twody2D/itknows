import Phaser from 'phaser';
import { MAX_VIRTUAL_WIDTH, MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';

/**
 * Keeps the internal resolution at a fixed VIRTUAL_HEIGHT with a floating
 * width (CLAUDE.md #2), then integer-zooms the canvas via CSS to fill the
 * viewport. A wide phone sees more of the level horizontally; it never sees
 * a stretched or letterboxed image.
 */
export class ScaleController {
  constructor(private game: Phaser.Game) {
    this.apply();
    window.addEventListener('resize', () => this.apply());
    window.addEventListener('orientationchange', () => this.apply());
  }

  private apply(): void {
    const zoom = Math.max(1, Math.floor(window.innerHeight / VIRTUAL_HEIGHT));
    const rawWidth = Math.round(window.innerWidth / zoom);
    const width = Phaser.Math.Clamp(rawWidth, MIN_VIRTUAL_WIDTH, MAX_VIRTUAL_WIDTH);

    this.game.scale.resize(width, VIRTUAL_HEIGHT);
    this.game.scale.setZoom(zoom);

    // setZoom sizes the canvas to an exact integer-pixel CSS box, which
    // almost never matches the viewport exactly (rounding, the width clamp
    // above, browser chrome) and leaves a blank margin — CLAUDE.md forbids
    // vertical letterboxing, and a leftover margin also reads as "the game
    // is small" even when the internal resolution is fine. Stretch the
    // canvas the rest of the way to fill the viewport; `image-rendering:
    // pixelated` (index.html) keeps pixel art crisp through the sub-one-zoom-
    // step supersample this adds.
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
  }
}
