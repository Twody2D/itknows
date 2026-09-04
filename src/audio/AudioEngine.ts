/**
 * Everything in this game's audio is synthesized at play-time — no MP3/OGG
 * ships (CLAUDE.md #3/§30 master-prompt: "не использовать много больших
 * MP3/OGG файлов"). This is the one place that touches the raw Web Audio
 * API; `SfxManager` only ever calls `playTone`/`playNoise` with musical
 * parameters, never a node graph.
 *
 * `AudioContext` doesn't exist under Vitest's `node` test environment, and
 * browsers refuse to start one before a user gesture — both are handled the
 * same way: every entry point is a silent no-op until a context exists and
 * is running, never a thrown error (same "missing capability degrades
 * quietly" contract as `YandexGamesService`/`SaveService`).
 */

export type ToneShape = OscillatorType;

export interface ToneOptions {
  /** Starting frequency in Hz. */
  frequency: number;
  /** If set, the oscillator glides linearly from `frequency` to this over `durationMs`. */
  endFrequency?: number;
  type?: ToneShape;
  durationMs: number;
  /** Time to ramp from silence to peak `gain`. */
  attackMs?: number;
  /** Time to decay from peak `gain` down to `sustainLevel * gain`. */
  decayMs?: number;
  /** Fraction of peak `gain` held between decay and release, 0..1. */
  sustainLevel?: number;
  /** Time to fade from the sustain level to silence at the end of `durationMs`. */
  releaseMs?: number;
  /** Peak linear gain, 0..1. */
  gain?: number;
  /** Schedules the note this many seconds after now — lets a caller lay out a short sequence without its own timers. */
  delaySec?: number;
}

export interface NoiseOptions {
  durationMs: number;
  gain?: number;
  filterType?: BiquadFilterType;
  filterFrequency?: number;
  attackMs?: number;
  releaseMs?: number;
  delaySec?: number;
}

class AudioEngineController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Real playback state — a page hidden by `visibilitychange` suspends the context, so nothing schedules into a silent one. */
  private ready(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    }
    // Browsers start a fresh context suspended until a user gesture; every
    // call site here only ever fires from inside a real click/tap/keydown
    // handler, so resuming unconditionally is safe and keeps this the only
    // place that has to know about the policy.
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx.state === 'running' || this.ctx.state === 'suspended' ? this.ctx : null;
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  playTone(opts: ToneOptions): void {
    const ctx = this.ready();
    if (!ctx || !this.masterGain) return;

    const t0 = ctx.currentTime + (opts.delaySec ?? 0);
    const durationSec = opts.durationMs / 1000;
    const attackSec = (opts.attackMs ?? 5) / 1000;
    const decaySec = (opts.decayMs ?? 0) / 1000;
    const releaseSec = (opts.releaseMs ?? 20) / 1000;
    const sustain = opts.sustainLevel ?? 0.6;
    const peakGain = opts.gain ?? 0.2;

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.frequency, t0);
    if (opts.endFrequency !== undefined) {
      osc.frequency.linearRampToValueAtTime(opts.endFrequency, t0 + durationSec);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(peakGain, t0 + attackSec);
    gainNode.gain.linearRampToValueAtTime(peakGain * sustain, t0 + attackSec + decaySec);
    const releaseStart = Math.max(t0 + attackSec + decaySec, t0 + durationSec - releaseSec);
    gainNode.gain.setValueAtTime(peakGain * sustain, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseSec);

    osc.connect(gainNode).connect(this.masterGain);
    osc.start(t0);
    osc.stop(releaseStart + releaseSec + 0.02);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.round(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  playNoise(opts: NoiseOptions): void {
    const ctx = this.ready();
    if (!ctx || !this.masterGain) return;

    const t0 = ctx.currentTime + (opts.delaySec ?? 0);
    const durationSec = opts.durationMs / 1000;
    const attackSec = (opts.attackMs ?? 2) / 1000;
    const releaseSec = (opts.releaseMs ?? 40) / 1000;
    const peakGain = opts.gain ?? 0.15;

    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);
    source.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(peakGain, t0 + attackSec);
    const releaseStart = Math.max(t0 + attackSec, t0 + durationSec - releaseSec);
    gainNode.gain.setValueAtTime(peakGain, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseSec);

    let lastNode: AudioNode = source;
    if (opts.filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType;
      filter.frequency.value = opts.filterFrequency ?? 1000;
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(gainNode).connect(this.masterGain);

    source.start(t0);
    source.stop(releaseStart + releaseSec + 0.02);
  }
}

export const AudioEngine = new AudioEngineController();
