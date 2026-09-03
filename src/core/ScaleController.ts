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
  }
}
