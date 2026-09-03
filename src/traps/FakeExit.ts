import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';

export interface FakeExitConfig {
  id: string;
  x: number;
  y: number;
}

/**
 * A decoy exit portal. Reuses the same "inactive" (unlit) texture the real
 * exit uses before it's reachable — the honest tell is that a fake exit
 * never glows the way the real one does (CLAUDE.md #4.7). Never lethal:
 * touching it just refuses entry with a small visual bump, never ends the
 * run or damages the player. Master-prompt §14 — use rarely, always fairly.
 */
export class FakeExit {
  readonly type = 'fake-exit';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;
  readonly zone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, config: FakeExitConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'exit-inactive');

    const width = TILE_SIZE * 2;
    const height = TILE_SIZE * 3;
    this.zone = scene.add.zone(config.x, config.y, width, height);
    scene.physics.add.existing(this.zone, true);
  }

  /** Called by the scene's overlap handler — visual refusal only, never lethal. */
  reject(): void {
    this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 120,
      repeat: 1,
    });
  }

  destroy(): void {
    this.gameObject.destroy();
    this.zone.destroy();
  }
}
