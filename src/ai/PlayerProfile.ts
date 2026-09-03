/**
 * Deterministic behavior profile (master-prompt §68 / CLAUDE.md #6) — not
 * ML, just smoothed telemetry. Session-only for now: persistence across
 * reloads arrives with SaveService (Phase 6), same as `GameState`.
 *
 * Every field is a plain number so the whole profile stays small and
 * inspectable (master-prompt §68 — "не хранить лишние данные"): counts,
 * fractions in [0,1], or an EMA (exponential moving average) of a
 * per-attempt measurement. EMA is used instead of storing full history so
 * "recent behavior" naturally outweighs old behavior without ever growing.
 */
export interface PlayerProfileData {
  /** Jumps per second of horizontally-active time, EMA across attempts. */
  jumpFrequency: number;
  /** 0..1 EMA fraction of active time spent holding left. */
  leftPreference: number;
  /** 0..1 EMA fraction of active time spent holding right. */
  rightPreference: number;
  /** EMA ms from a trap's warning telegraph to the player's next reactive input. */
  averageReaction: number;
  /** 0..1 EMA — how often the player pushes through danger they were near instead of avoiding it entirely. */
  riskLevel: number;
  /** Lifetime death counts by cause — the level codebase's only three: spike/trap/fall. */
  deathPatterns: { spike: number; trap: number; fall: number };
  /** EMA ms of idle time before the first input at the start of an attempt. */
  hesitationTime: number;
  /** -1 (left-biased) .. +1 (right-biased) EMA route bias. */
  preferredRoute: number;
  /** Cleared/died outcomes over a bounded recent window (last 5 attempts). */
  recentFailures: number;
  recentSuccesses: number;
}

const EMA_ALPHA = 0.3;
const RECENT_WINDOW = 5;

function ema(previous: number, sample: number): number {
  return previous + EMA_ALPHA * (sample - previous);
}

/** Raw per-attempt measurements handed off by `BehaviorTracker` at attempt end. */
export interface AttemptSummary {
  jumps: number;
  activeMs: number;
  leftMs: number;
  rightMs: number;
  hesitationMs: number;
  reactionSamplesMs: number[];
  riskEncounters: number;
  riskSurvived: number;
  cause: 'spike' | 'trap' | 'fall' | null;
  cleared: boolean;
}

class PlayerProfileStore {
  private data: PlayerProfileData = PlayerProfileStore.initial();
  private recentOutcomes: boolean[] = [];

  private static initial(): PlayerProfileData {
    return {
      jumpFrequency: 0,
      leftPreference: 0.5,
      rightPreference: 0.5,
      averageReaction: MID_REACTION_ESTIMATE_MS,
      riskLevel: 0,
      deathPatterns: { spike: 0, trap: 0, fall: 0 },
      hesitationTime: 0,
      preferredRoute: 0,
      recentFailures: 0,
      recentSuccesses: 0,
    };
  }

  snapshot(): Readonly<PlayerProfileData> {
    return this.data;
  }

  reset(): void {
    this.data = PlayerProfileStore.initial();
    this.recentOutcomes = [];
  }

  integrate(summary: AttemptSummary): void {
    const activeSeconds = summary.activeMs / 1000;
    const jumpFreqSample = activeSeconds > 0 ? summary.jumps / activeSeconds : this.data.jumpFrequency;
    const sideTotal = summary.leftMs + summary.rightMs;
    const leftSample = sideTotal > 0 ? summary.leftMs / sideTotal : this.data.leftPreference;
    const rightSample = sideTotal > 0 ? summary.rightMs / sideTotal : this.data.rightPreference;
    const routeSample = sideTotal > 0 ? (summary.rightMs - summary.leftMs) / sideTotal : this.data.preferredRoute;

    if (summary.reactionSamplesMs.length > 0) {
      const avg = summary.reactionSamplesMs.reduce((a, b) => a + b, 0) / summary.reactionSamplesMs.length;
      this.data.averageReaction = ema(this.data.averageReaction, avg);
    }

    const riskSample = summary.riskEncounters > 0 ? summary.riskSurvived / summary.riskEncounters : this.data.riskLevel;

    this.data = {
      ...this.data,
      jumpFrequency: ema(this.data.jumpFrequency, jumpFreqSample),
      leftPreference: ema(this.data.leftPreference, leftSample),
      rightPreference: ema(this.data.rightPreference, rightSample),
      riskLevel: ema(this.data.riskLevel, riskSample),
      hesitationTime: ema(this.data.hesitationTime, summary.hesitationMs),
      preferredRoute: ema(this.data.preferredRoute, routeSample),
      deathPatterns: {
        spike: this.data.deathPatterns.spike + (summary.cause === 'spike' ? 1 : 0),
        trap: this.data.deathPatterns.trap + (summary.cause === 'trap' ? 1 : 0),
        fall: this.data.deathPatterns.fall + (summary.cause === 'fall' ? 1 : 0),
      },
    };

    this.recentOutcomes.push(summary.cleared);
    if (this.recentOutcomes.length > RECENT_WINDOW) this.recentOutcomes.shift();
    this.data.recentSuccesses = this.recentOutcomes.filter(Boolean).length;
    this.data.recentFailures = this.recentOutcomes.length - this.data.recentSuccesses;
  }
}

/** Neutral starting guess — halfway between the honesty-floor reaction window and a very slow one. */
const MID_REACTION_ESTIMATE_MS = 600;

export const PlayerProfile = new PlayerProfileStore();
