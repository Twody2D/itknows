import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { generateFxTextures } from './textures';
import { FxQuality } from './FxSettings';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type Alphable = Phaser.GameObjects.GameObject & { alpha: number };

/** Fragment colours per Death FX variant — see `deathBurst`. */
const DEATH_FRAGMENT_TINT: Record<'static' | 'glitch' | 'data_wipe', number[]> = {
  static: [PALETTE.white, PALETTE.danger],
  glitch: [PALETTE.cyan, PALETTE.system],
  data_wipe: [PALETTE.white, PALETTE.cyanGlow],
};

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
  private clipMask: Phaser.Display.Masks.GeometryMask | null = null;

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
    if (!FxQuality.particlesAllowed()) return;
    this.jumpDustEmitter.explode(5, x, y - 3);
  }

  landDust(x: number, y: number): void {
    if (!FxQuality.particlesAllowed()) return;
    this.landDustEmitter.explode(7, x, y - 3);
  }

  /**
   * Pixel-fragment scatter + flash + glitch tearing — the whole thing settles
   * within the death-restart budget (CLAUDE.md #5, < 700ms total). `variant`
   * is a purely cosmetic shop unlock (`InventoryService`'s `death_fx` slot),
   * and none of the three touches timing or the death itself.
   *
   * Each one now has its own signature rather than differing only in how many
   * slices it draws — side by side in the shop's preview the three read as
   * the same effect at three intensities, which is not something to charge
   * 120 credits for (owner's call, 2026-09-12):
   * - `static` — the standard shutdown: red-hot fragments, a red flash, one
   *   pass of cyan scanline tearing.
   * - `glitch` — colour separation: the tearing splits into cyan and violet
   *   passes kicked far in opposite directions, over a cool flash and a
   *   tighter, faster fragment burst. Cold and wide where `static` is hot and
   *   compact.
   * - `data_wipe` (SYSTEM ACCESS bundle exclusive) — erasure: a white bar
   *   sweeps through where the android stood, under a held white flash and
   *   the biggest fragment count. Reads as being deleted, not blown up.
   */
  deathBurst(x: number, y: number, variant: 'static' | 'glitch' | 'data_wipe' = 'static', shake = true): void {
    if (FxQuality.particlesAllowed()) {
      // The fragments carry the variant's colour too, otherwise all three
      // rain the same red and the signature is only half applied.
      this.deathEmitter.setParticleTint(DEATH_FRAGMENT_TINT[variant]);
      this.deathEmitter.explode(variant === 'data_wipe' ? 24 : variant === 'glitch' ? 10 : 14, x, y);
    }

    if (variant === 'glitch') {
      this.flash(x, y, PALETTE.cyan, 0.18);
      this.glitchSlice(x, y - 5, 12, PALETTE.cyan);
      this.glitchSlice(x, y + 3, -12, PALETTE.system);
      this.glitchSlice(x, y - 1, 7, PALETTE.white);
    } else if (variant === 'data_wipe') {
      this.flash(x, y, PALETTE.white, 0.34);
      this.wipeBar(x, y);
      this.glitchSlice(x, y, 4, PALETTE.white);
    } else {
      this.flash(x, y, PALETTE.danger, 0.22);
      this.glitchSlice(x, y, 5, PALETTE.cyan);
    }

    // `shake: false` is for the shop's looping preview — the same burst
    // without jolting a screen the player is reading, never for real deaths.
    if (shake) this.shake(140, variant === 'data_wipe' ? 0.01 : 0.006);
  }

  victoryBurst(x: number, y: number): void {
    if (FxQuality.particlesAllowed()) this.victoryEmitter.explode(18, x, y);
    this.flash(x, y, PALETTE.reward, 0.16);
    this.pulseRing(x, y);
  }

  /**
   * Clips everything this manager draws to `mask` — the shop's looping death
   * preview plays the real burst inside a 62x64 stage, and fragments that
   * flew out of it would otherwise land all over the panel. Gameplay never
   * sets one (`null` is the normal state).
   */
  setClipMask(mask: Phaser.Display.Masks.GeometryMask | null): void {
    this.clipMask = mask;
    for (const emitter of [this.jumpDustEmitter, this.landDustEmitter, this.deathEmitter, this.victoryEmitter]) {
      if (mask) emitter.setMask(mask);
      else emitter.clearMask();
    }
  }

  shake(durationMs: number, intensity: number): void {
    if (!FxQuality.screenEffectsAllowed()) return;
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
    if (this.clipMask) rect.setMask(this.clipMask);
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      onComplete: () => rect.destroy(),
    });
  }

  /**
   * A cheap pixel-art stand-in for a digital glitch: a few thin slices that
   * kick sideways and fade, no shader. `kick` sets how far they slide and
   * which way the pass leans (negative mirrors it), `color` which channel the
   * pass stands for — that pair is what gives `glitch` its colour-separated
   * tearing without a second effect to maintain.
   */
  private glitchSlice(x: number, y: number, kick = 5, color: number = PALETTE.cyan): void {
    for (let i = 0; i < 3; i++) {
      const w = 10 + i * 4;
      const slice = this.scene.add.rectangle(x, y - 6 + i * 5, w, 1, color, 0.5).setDepth(145);
      if (this.clipMask) slice.setMask(this.clipMask);
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

  /** DATA WIPE's own mark: a solid white bar that sweeps down through the android and thins out as it goes — an erase head, not an explosion. */
  private wipeBar(x: number, y: number): void {
    const bar = this.scene.add.rectangle(x, y - 16, 30, 6, PALETTE.white, 0.9).setDepth(146);
    if (this.clipMask) bar.setMask(this.clipMask);
    this.scene.tweens.add({
      targets: bar,
      y: y + 6,
      scaleY: 0.15,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => bar.destroy(),
    });
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
