import { AudioEngine } from './AudioEngine';
import type { ToneShape } from './AudioEngine';

export type Mood = 'calm' | 'tension' | 'victory';

interface NoteEvent {
  /** Offset in beats from the start of the loop. */
  beat: number;
  frequency: number;
  type: ToneShape;
  /** Note length in beats. */
  durationBeats: number;
  gain: number;
}

interface MusicPattern {
  bpm: number;
  /** Loop length in beats — also how often mood changes get picked up (see `MusicSequencer` doc comment). */
  beats: number;
  loop: boolean;
  notes: NoteEvent[];
}

/**
 * Deliberately sparse (master-prompt §30/§31: "музыка должна быть очень
 * лёгкой", "не загружать огромные треки") — a couple of `AudioEngine.playTone`
 * calls per loop, not a real multi-instrument arrangement. `calm` is a slow
 * sustained bass note with an occasional soft blip; `tension` doubles the
 * bass pulse and adds a tighter, slightly dissonant two-note tick; `victory`
 * is a short one-shot rising arpeggio, the musical cousin of the
 * `levelComplete` SFX rather than something that loops.
 */
const PATTERNS: Record<Mood, MusicPattern> = {
  calm: {
    bpm: 88,
    beats: 4,
    loop: true,
    notes: [
      { beat: 0, frequency: 110, type: 'triangle', durationBeats: 3.5, gain: 0.05 },
      { beat: 2, frequency: 261.6, type: 'sine', durationBeats: 0.5, gain: 0.04 },
    ],
  },
  tension: {
    bpm: 108,
    beats: 4,
    loop: true,
    notes: [
      { beat: 0, frequency: 110, type: 'square', durationBeats: 1.2, gain: 0.06 },
      { beat: 2, frequency: 116.5, type: 'square', durationBeats: 1.2, gain: 0.06 },
      { beat: 1, frequency: 293.7, type: 'square', durationBeats: 0.3, gain: 0.045 },
      { beat: 3, frequency: 261.6, type: 'square', durationBeats: 0.3, gain: 0.045 },
    ],
  },
  victory: {
    bpm: 120,
    beats: 4,
    loop: false,
    notes: [
      { beat: 0, frequency: 261.6, type: 'square', durationBeats: 0.9, gain: 0.14 },
      { beat: 1, frequency: 329.6, type: 'square', durationBeats: 0.9, gain: 0.14 },
      { beat: 2, frequency: 392.0, type: 'square', durationBeats: 0.9, gain: 0.14 },
      { beat: 3, frequency: 523.25, type: 'square', durationBeats: 1.8, gain: 0.16 },
    ],
  },
};

/** How long a `requestTension()` call keeps tension active with no renewal, before the next loop boundary reverts to `calm`. */
const TENSION_HOLD_MS = 4000;

/**
 * Loop-boundary music state machine (master-prompt §31: calm / tension /
 * critical / victory — `critical` isn't split out yet, see the class doc
 * below). Mood changes are picked up at the *next* loop boundary rather than
 * cut in immediately: Web Audio notes already scheduled this loop keep
 * playing to their natural end, so a mood switch never chops a note or bar
 * off mid-phrase ("плавные переходы"). A trap's own warning already fires
 * instantly through `SfxManager` — the music layer reacting a beat or two
 * later is the intended division of labor between "immediate danger cue"
 * (SFX) and "ambient mood" (music), not a bug.
 *
 * No lookahead-scheduler ticker: each loop's notes are all scheduled at once
 * via `AudioEngine.playTone`'s own `delaySec` (sample-accurate regardless of
 * JS timer jitter — that's what Web Audio's own clock is for), and a single
 * `setTimeout` sized to the loop's real duration schedules the next one.
 * That's enough precision for a two-note-per-bar ambient layer; a longer,
 * denser arrangement would need the classic lookahead-ticker pattern instead.
 */
class MusicSequencerController {
  private currentMood: Mood | null = null;
  private pendingMood: Mood | null = null;
  private tensionUntilMs = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Starts the calm loop — call once per level attempt (`GameplayScene.create()`). */
  start(): void {
    this.stop();
    this.currentMood = 'calm';
    this.playLoop(PATTERNS.calm);
  }

  /** A trap just armed (or any other momentary threat) — holds `tension` until `TENSION_HOLD_MS` after the last call with nothing new. */
  requestTension(nowMs: number = performance.now()): void {
    this.tensionUntilMs = nowMs + TENSION_HOLD_MS;
    if (this.currentMood !== 'tension') this.pendingMood = 'tension';
  }

  /** Level cleared — plays the one-shot victory phrase and stops looping (the scene is about to transition away regardless). */
  celebrateVictory(): void {
    this.stop();
    this.currentMood = 'victory';
    this.playLoop(PATTERNS.victory);
  }

  /** Cancels the pending loop timer — required on every `GameplayScene` shutdown, or a dead attempt's loop keeps firing into the next one (CLAUDE.md #9-adjacent: no leaked timers across scene restarts). */
  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.currentMood = null;
    this.pendingMood = null;
  }

  getCurrentMood(): Mood | null {
    return this.currentMood;
  }

  private playLoop(pattern: MusicPattern): void {
    const secondsPerBeat = 60 / pattern.bpm;

    for (const note of pattern.notes) {
      AudioEngine.playTone({
        frequency: note.frequency,
        type: note.type,
        durationMs: note.durationBeats * secondsPerBeat * 1000,
        gain: note.gain,
        attackMs: 15,
        decayMs: 80,
        sustainLevel: 0.5,
        releaseMs: 120,
        delaySec: note.beat * secondsPerBeat,
      });
    }

    if (!pattern.loop) return;

    const loopDurationMs = pattern.beats * secondsPerBeat * 1000;
    this.timer = setTimeout(() => this.advance(), loopDurationMs);
  }

  private advance(): void {
    const nowMs = performance.now();
    let next: Mood = this.currentMood ?? 'calm';
    if (this.pendingMood) {
      next = this.pendingMood;
      this.pendingMood = null;
    } else if (this.currentMood === 'tension' && nowMs > this.tensionUntilMs) {
      next = 'calm';
    }
    this.currentMood = next;
    this.playLoop(PATTERNS[next]);
  }
}

export const MusicSequencer = new MusicSequencerController();
