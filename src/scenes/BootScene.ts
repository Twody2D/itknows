import Phaser from 'phaser';
import { generateAllTextures } from '@/art/SpriteFactory';
import { fontsReady } from '@/ui/fonts';

/**
 * No asset files are ever loaded (CLAUDE.md #3) — this scene generates every
 * texture procedurally on an offscreen canvas before the menu appears.
 *
 * Also the one place that waits on the self-hosted UI webfonts (`ui/fonts`)
 * before handing control to the menu — see `fontsReady`'s own doc comment
 * for why a DOM-text label computed from a sibling's width needs the real
 * font in place from the first frame, not swapped in underneath it later.
 * `@fontsource` files are same-origin and small, so in practice this adds
 * a handful of milliseconds, not a visible wait.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateAllTextures(this);
    void fontsReady().finally(() => this.scene.start('MainMenuScene'));
  }
}
