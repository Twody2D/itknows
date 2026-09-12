import Phaser from 'phaser';
import { generateAllTextures } from '@/art/SpriteFactory';
import { fontsReady } from '@/ui/fonts';
import { SaveService } from '@/services/SaveService';

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
 *
 * STRAIGHT INTO THE LEVEL, NOT THE MENU. Opening the game puts the player in
 * the level they are on, and the menu is one tap away behind the pause
 * button. This is the one thing worth copying from the reference game the
 * owner shared: the distance between opening the game and playing it is the
 * cheapest retention there is, and on the Yandex Games feed a player decides
 * in about five seconds. Nothing is lost — the shop, the level map and the
 * settings all still live in the menu, which the pause card links to.
 *
 * `LoadingAPI.ready` moves with it: CLAUDE.md #8 ties that call to the moment
 * the game is genuinely interactive, and that moment is now the level, so
 * `GameplayScene` fires it too (the service is idempotent — only the first
 * call reaches the SDK).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateAllTextures(this);
    void fontsReady().finally(() =>
      this.scene.start('GameplayScene', { levelId: SaveService.getResumeLevelId(), entryTransition: true }),
    );
  }
}
