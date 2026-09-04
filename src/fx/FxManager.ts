import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { generateFxTextures } from './textures';
import { FxSettings } from './FxSettings';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type Alphable = Phaser.GameObjects.GameObject & { alpha: number };

/**
 * Every burst effect in the game (jump dust, landing dust, death, victory,
 * trap warning-pulse) plus camera shake, in one place. Every particle
 * emitter is created once here — Phaser's `ParticleEmitter` is itself an
 * object pool — and only ever `.explode()`d afterward; nothing here
 * allocates a new game object mid-`update()` (CLAUDE.md #9). `FxSettings`
 * is read live so a future Settings screen can disable particles/shake
 * without this class knowing anything about UI.
 */
export class FxManager {
  private scene: Phaser.Scene;
  private jumpDustEmitter: Emitter;
  private landDustEmitter: Emitter;
  private deathEmitter: Emitter;
  private victoryEmitter: Emitter;
  private pulses = new Map<string, Phaser.Tweens.Tween>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    generateFxTextures(scene);

    this.jumpDustEmitter = scene.add
      .particles(0, 0, 'fx-dot', {
        emitting: false,
        tint: PALETTE.cyan,
        lifespan: 260,
        speed: { min: 14, max: 34 },
        angle: { min: 250, max: 290 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.8, end: 0 },
      })
      .setDepth(120);

    this.landDustEmitter = scene.add
      .particles(0, 0, 'fx-dot', {
        emitting: false,
        tint: PALETTE.white,
        lifespan: 300,
        speed: { min: 16, max: 40 },
        angle: { min: 200, max: 340 },
        scale: { start: 1.6, end: 0 },
        alpha: { start: 0.75, end: 0 },
      })
      .setDepth(120);

    this.deathEmitter = scene.add
      .particles(0, 0, 'fx-dot', {
        emitting: false,
        tint: [PALETTE.white, PALETTE.danger],
        lifespan: { min: 220, max: 380 },
        speed: { min: 30, max: 110 },
        gravityY: 260,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(150);

    this.victoryEmitter = scene.add
      .particles(0, 0, 'fx-spark', {
        emitting: false,
        tint: [PALETTE.reward, PALETTE.cyan],
        lifespan: { min: 300, max: 560 },
        speed: { min: 20, max: 70 },
        scale: { start: 1.3, end: 0 },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(150);
  }

  /** Spawned a couple pixels above the contact point — right on it lands exactly on the ground tile's own top-edge highlight line and camouflages against it. */
  jumpDust(x: number, y: number): void {
    if (!FxSettings.particlesEnabled) return;
    this.jumpDustEmitter.explode(5, x, y - 3);
  }

  landDust(x: number, y: number): void {
    if (!FxSettings.particlesEnabled) return;
    this.landDustEmitter.explode(7, x, y - 3);
  }

  /**
   * Pixel-fragment scatter + flash + a short glitch slice — the whole thing
   * settles within the death-restart budget (CLAUDE.md #5, < 700ms total).
   * `variant` is a purely cosmetic shop unlock (`InventoryService`'s
   * `death_fx` slot) — `static` is this exact effect, unchanged; `glitch`
   * layers on two extra, wider glitch-slice passes. Neither variant touches
   * timing or the death itself, only what it looks like.
   */
  deathBurst(x: number, y: number, variant: 'static' | 'glitch' = 'static'): void {
    if (FxSettings.particlesEnabled) this.deathEmitter.explode(14, x, y);
    this.flash(x, y, PALETTE.danger, 0.22);
    this.glitchSlice(x, y);
    if (variant === 'glitch') {
      this.glitchSlice(x, y - 4, 6);
      this.glitchSlice(x, y + 4, 9);
    }
    this.shake(140, 0.006);
  }

  victoryBurst(x: number, y: number): void {
    if (FxSettings.particlesEnabled) this.victoryEmitter.explode(18, x, y);
    this.flash(x, y, PALETTE.reward, 0.16);
    this.pulseRing(x, y);
  }

  shake(durationMs: number, intensity: number): void {
    if (!FxSettings.shakeEnabled) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** Fast alpha pulse on a trap's own hazard object while it telegraphs (CLAUDE.md #4.2) — multiplies with whatever fill/alpha the trap already sets, doesn't fight it. */
  startWarningPulse(id: string, target: Alphable): void {
    this.stopWarningPulse(id, target);
    const tween = this.scene.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0.35 },
      duration: 130,
      yoyo: true,
      repeat: -1,
    });
    this.pulses.set(id, tween);
  }

  stopWarningPulse(id: string, target?: Alphable): void {
    const tween = this.pulses.get(id);
    if (tween) {
      tween.stop();
      this.pulses.delete(id);
    }
    if (target) target.alpha = 1;
  }

  private flash(x: number, y: number, color: number, alpha: number): void {
    const rect = this.scene.add.rectangle(x, y, 24, 24, color, alpha).setDepth(140).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      onComplete: () => rect.destroy(),
    });
  }

  /** A cheap pixel-art stand-in for a digital glitch: a few thin slices that kick sideways and fade, no shader. `kick` widens the sideways offset — the `glitch` Death FX variant calls this twice more with a wider kick than the base effect uses. */
  private glitchSlice(x: number, y: number, kick = 5): void {
    for (let i = 0; i < 3; i++) {
      const w = 10 + i * 4;
      const slice = this.scene.add.rectangle(x, y - 6 + i * 5, w, 1, PALETTE.cyan, 0.5).setDepth(145);
      this.scene.tweens.add({
        targets: slice,
        x: x + (i % 2 === 0 ? kick : -kick),
        alpha: 0,
        duration: 140,
        delay: i * 20,
        onComplete: () => slice.destroy(),
      });
    }
  }

  private pulseRing(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y).setStrokeStyle(1, PALETTE.reward, 0.9).setDepth(140);
    ring.radius = 4;
    this.scene.tweens.add({
      targets: ring,
      radius: 26,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
  }

  destroy(): void {
    for (const tween of this.pulses.values()) tween.stop();
    this.pulses.clear();
  }
}
