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
  /** A plain rectangle swept by hand, never a physics body — see `TriggerTrap.bounds` for why an overlap zone under the player's feet is a trampoline. */
  readonly zone: Phaser.Geom.Rectangle;
  private rejecting: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: FakeExitConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'exit-inactive');

    const width = TILE_SIZE * 2;
    const height = TILE_SIZE * 3;
    this.zone = new Phaser.Geom.Rectangle(config.x - width / 2, config.y - height / 2, width, height);
  }

  /** Called by the scene's contact sweep — visual refusal only, never lethal. */
  reject(): void {
    // The sweep calls this every frame the player stands in the doorway, so
    // the refusal has to be one bump per visit, not a tween stacked per
    // frame.
    if (this.rejecting?.isPlaying()) return;
    this.rejecting = this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 120,
      repeat: 1,
    });
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
