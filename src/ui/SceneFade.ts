import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';

/**
 * A brief fade-from-black on scene entry, for deliberate navigation only —
 * main menu → gameplay, sector complete → next sector, arriving on the main
 * menu itself. Never call this from the death→retry path or a same-level
 * restart: CLAUDE.md #5's <700ms restart budget has no room for it, and
 * `GameplayScene`/`SectorCompleteScene`'s doc comments are explicit that the
 * level-to-level and retry loops stay instant on purpose.
 *
 * A plain full-viewport `Rectangle`, not `camera.fadeOut`/`fadeIn` — those
 * operate on a single camera, and `GameplayScene` runs two (world + UI); a
 * rectangle added at the top of `create()`, before either camera's ignore
 * list is set up, renders on both without any extra wiring.
 */
export function fadeIn(scene: Phaser.Scene, durationMs = 220): void {
  const { width, height } = scene.scale;
  const overlay = scene.add
    .rectangle(0, 0, width, height, PALETTE.bgVoid, 1)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(2000);

  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration: durationMs,
    ease: 'Sine.easeOut',
    onComplete: () => overlay.destroy(),
  });
}
