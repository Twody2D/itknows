import type Phaser from 'phaser';
import { InventoryService } from '@/services/InventoryService';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';
import type { PlayerAnimState } from './PlayerAnimState';

/** Readable but clearly not the real player (master-prompt §40 — "не мешает gameplay"). */
const GHOST_ALPHA = 0.35;

/** Below this per-sample horizontal drift the ghost reads as standing still rather than jittering between idle/run every frame. */
const RUN_DRIFT_PX = 1;
const VERTICAL_DRIFT_PX = 2;

/**
 * Silent, non-colliding replay of a level's own best run. Pure visual: no
 * physics body, drives no gameplay state, reads only the flat
 * `[t,x,y,facing]×N` trace `GhostRecorder` produced. Interpolates between
 * samples so ~8Hz recording still moves smoothly at 60 FPS, and hides once
 * the recorded run's own clock runs out (it doesn't loop).
 *
 * Takes elapsed-since-attempt-start directly on every `update()` call rather
 * than an absolute clock reading plus its own stored start time — the caller
 * (`GameplayScene`) already has to compute that same elapsed value for
 * `GhostRecorder`, and it's the one that actually knows when "attempt start"
 * landed (`this.time.now` reads 0 during a scene's own `create()`, before
 * its first real tick — see `GameplayScene.attemptStartMs`'s doc comment).
 */
export class GhostSprite {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly samples: readonly number[];
  private readonly texPrefix: string;
  private currentAnim: PlayerAnimState | null = null;
  private cursor = 0;

  constructor(scene: Phaser.Scene, samples: readonly number[]) {
    this.samples = samples;
    this.texPrefix = playerTexturePrefix(InventoryService.getEquipped('character'));

    const startX = this.at(1);
    const startY = this.at(2);
    this.sprite = scene.add.sprite(startX, startY, `${this.texPrefix}-idle-0`);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setAlpha(GHOST_ALPHA);
    this.playAnim('idle');
  }

  /** By construction every index this class computes stays within `samples` — a hit here means a caller passed a malformed trace, not a normal runtime state. */
  private at(index: number): number {
    const value = this.samples[index];
    if (value === undefined) throw new Error('GhostSprite: sample index out of range');
    return value;
  }

  private get sampleCount(): number {
    return this.samples.length / 4;
  }

  private playAnim(state: PlayerAnimState): void {
    if (this.currentAnim === state) return;
    this.currentAnim = state;
    this.sprite.play(`${this.texPrefix}-${state}`, true);
  }

  update(elapsed: number): void {
    const count = this.sampleCount;
    if (count === 0) {
      this.sprite.setVisible(false);
      return;
    }

    const lastT = this.at((count - 1) * 4);
    if (elapsed >= lastT) {
      this.sprite.setVisible(false);
      return;
    }

    const firstT = this.at(0);
    if (elapsed <= firstT) {
      this.sprite.setVisible(true);
      this.sprite.setPosition(this.at(1), this.at(2));
      this.sprite.setFlipX(this.at(3) === 1);
      return;
    }

    while (this.cursor < count - 2 && this.at((this.cursor + 1) * 4) < elapsed) this.cursor++;
    while (this.cursor > 0 && this.at(this.cursor * 4) > elapsed) this.cursor--;

    const i0 = this.cursor * 4;
    const i1 = i0 + 4;
    const t0 = this.at(i0);
    const x0 = this.at(i0 + 1);
    const y0 = this.at(i0 + 2);
    const facing0 = this.at(i0 + 3);
    const t1 = this.at(i1);
    const x1 = this.at(i1 + 1);
    const y1 = this.at(i1 + 2);

    const span = t1 - t0;
    const frac = span > 0 ? (elapsed - t0) / span : 0;

    this.sprite.setVisible(true);
    this.sprite.setPosition(x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac);
    this.sprite.setFlipX(facing0 === 1);

    const dx = x1 - x0;
    const dy = y1 - y0;
    if (dy < -VERTICAL_DRIFT_PX) this.playAnim('jump');
    else if (dy > VERTICAL_DRIFT_PX) this.playAnim('fall');
    else if (Math.abs(dx) > RUN_DRIFT_PX) this.playAnim('run');
    else this.playAnim('idle');
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
