import { AudioEngine } from './AudioEngine';
import './AudioSettings';

/**
 * Named, procedurally-synthesized SFX catalog (master-prompt §30) — every
 * patch below is a couple of `AudioEngine.playTone`/`playNoise` calls, never
 * a sample. Called directly from the same places `FxManager`'s visual
 * effects already are (`GameplayScene`'s event handlers, `PixelButton`) —
 * not a separate `EventBus` subscriber, so there's exactly one thing per
 * gameplay moment deciding "does this happen", not two systems independently
 * listening for the same event.
 *
 * §30's list has 12 entries; this ships 8. The other 4 don't map onto a real
 * moment in this game: `dash` — there is no dash (`config/physics.ts`'s own
 * comment: "There is deliberately no dash"); `retry` — restart here is an
 * automatic continuation of death 450ms later (`GameplayScene
 * .handlePlayerDeath`), not a separate player action, so a second sound on
 * top of the death sound would just be noise; `hit` — the game has no
 * damage-but-survive state, every hit is the death that already has a
 * sound; `reward` — there's no currency/reward event yet (Phase 6 shop), so
 * it's folded into `levelComplete` for now.
 *
 * Pitch variation: the sounds a player hears many times per attempt (jump,
 * land, uiClick) or many times per level (trapTrigger) get a
 * small random frequency jitter so they don't fatigue into an audible tick-
 * tick-tick loop. This is cosmetic randomness in the audio layer only — it
 * never touches gameplay state, timing, or geometry, so it doesn't conflict
 * with CLAUDE.md #4.6's "no RNG in gameplay" (that rule is about level
 * outcomes being deterministic from `(levelId, seed)`, not about
 * whether a footstep sounds a few percent different each time). `trapWarning`
 * deliberately keeps a fixed pitch — it's a telegraphed danger cue
 * (CLAUDE.md #4.2), and a recognizable, unchanging signal is the point.
 */
export type SfxName =
  | 'jump'
  | 'land'
  | 'death'
  | 'trapWarning'
  | 'trapTrigger'
  | 'levelComplete'
  | 'uiClick';

/** ±`percent` random multiplier, e.g. `jitter(0.05)` => somewhere in [0.95, 1.05]. */
function jitter(percent: number): number {
  return 1 + (Math.random() * 2 - 1) * percent;
}

const PATCHES: Record<SfxName, () => void> = {
  jump: () => {
    const mul = jitter(0.06);
    AudioEngine.playTone({
      frequency: 320 * mul,
      endFrequency: 640 * mul,
      type: 'square',
      durationMs: 90,
      attackMs: 3,
      decayMs: 30,
      sustainLevel: 0.4,
      releaseMs: 45,
      gain: 0.16,
    });
  },
  land: () => {
    const mul = jitter(0.06);
    AudioEngine.playTone({
      frequency: 160 * mul,
      endFrequency: 70 * mul,
      type: 'triangle',
      durationMs: 70,
      attackMs: 2,
      decayMs: 40,
      sustainLevel: 0.2,
      releaseMs: 30,
      gain: 0.18,
    });
    AudioEngine.playNoise({ durationMs: 40, gain: 0.06, filterType: 'lowpass', filterFrequency: 500 });
  },
  death: () => {
    AudioEngine.playTone({
      frequency: 260,
      endFrequency: 55,
      type: 'sawtooth',
      durationMs: 260,
      attackMs: 2,
      decayMs: 100,
      sustainLevel: 0.3,
      releaseMs: 130,
      gain: 0.2,
    });
    AudioEngine.playNoise({ durationMs: 180, gain: 0.14, filterType: 'lowpass', filterFrequency: 900 });
  },
  trapWarning: () => {
    AudioEngine.playTone({
      frequency: 880,
      type: 'square',
      durationMs: 45,
      attackMs: 2,
      decayMs: 15,
      sustainLevel: 0.5,
      releaseMs: 20,
      gain: 0.1,
    });
  },
  trapTrigger: () => {
    const mul = jitter(0.05);
    AudioEngine.playTone({
      frequency: 900 * mul,
      endFrequency: 140 * mul,
      type: 'sawtooth',
      durationMs: 150,
      attackMs: 1,
      decayMs: 50,
      sustainLevel: 0.2,
      releaseMs: 90,
      gain: 0.18,
    });
    AudioEngine.playNoise({ durationMs: 100, gain: 0.12, filterType: 'highpass', filterFrequency: 1200 });
  },
  levelComplete: () => {
    // Short rising major-ish arpeggio — reward without needing a real music layer.
    const notes = [523, 659, 784];
    for (let i = 0; i < notes.length; i++) {
      AudioEngine.playTone({
        frequency: notes[i]!,
        type: 'square',
        durationMs: 160,
        attackMs: 4,
        decayMs: 50,
        sustainLevel: 0.4,
        releaseMs: 90,
        gain: 0.15,
        delaySec: i * 0.09,
      });
    }
  },
  uiClick: () => {
    AudioEngine.playTone({
      frequency: 700 * jitter(0.04),
      type: 'square',
      durationMs: 35,
      attackMs: 1,
      decayMs: 12,
      sustainLevel: 0.2,
      releaseMs: 12,
      gain: 0.09,
    });
  },
};

/** The only entry point gameplay/UI code should call — `AudioEngine`/patches stay internal. */
export function playSfx(name: SfxName): void {
  PATCHES[name]();
}
