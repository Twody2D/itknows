import { DIALOGUE_POOLS } from '@/data/dialogues';
import type { CommentCategory, DialogueLine } from '@/data/dialogues';
import { LocaleState } from '@/i18n/Locale';
import { EventBus } from '@/core/EventBus';

const RECENT_HISTORY_SIZE = 8;
const EARLY_DEATH_MS = 2500;
const NEAR_EXIT_FRACTION = 0.85;
const MULTIPLE_DEATHS_INTERVAL = 10;
export const HESITATION_THRESHOLD_MS = 4000;

export interface DeathCommentContext {
  cause: 'spike' | 'trap' | 'fall';
  /** ms from attempt start to this death. */
  attemptElapsedMs: number;
  /** Session-wide death count, including this one. */
  totalDeaths: number;
  /** Consecutive deaths on this level with this exact cause, including this one. */
  repeatDeathCount: number;
  /** Player's x position at death as a 0..1 fraction of the level's width. */
  progressFraction: number;
}

/**
 * Picks THE SYSTEM's line for a death, an adaptation, or a stalled start
 * (master-prompt §16-18). Two responsibilities kept separate on purpose:
 * `resolveDeathCategory` is the priority cascade (§18: specific event >
 * repeated failure > near miss > general death) mapped onto the 7 named
 * categories (§17); `emitFrom` is the anti-repeat line picker, independent
 * of *why* a category was chosen. Rendering the emitted `system:comment`
 * event is the scene's job, not this module's (EventBus decouples them,
 * same as every other cross-scene system here).
 */
class CommentatorStore {
  private recentLineIds: string[] = [];

  reset(): void {
    this.recentLineIds = [];
  }

  /**
   * §18's priority order, applied to the 5 categories that can describe a
   * *specific death* (near_exit/fall/early_death read as "specific event";
   * repeated_mistake/multiple_deaths read as "repeated failure"; "near
   * miss" has no death-time equivalent here — nothing died near a miss by
   * definition — so it's skipped; `general` is the final "general death"
   * fallback). `successful_adaptation` and `long_hesitation` are triggered
   * by different events entirely (a clear, and attempt start) — see
   * `commentOnAdaptation`/`commentOnHesitation`.
   */
  resolveDeathCategory(ctx: DeathCommentContext): CommentCategory {
    if (ctx.progressFraction >= NEAR_EXIT_FRACTION) return 'near_exit';
    if (ctx.cause === 'fall') return 'fall';
    if (ctx.attemptElapsedMs <= EARLY_DEATH_MS) return 'early_death';
    if (ctx.repeatDeathCount >= 2) return 'repeated_mistake';
    if (ctx.totalDeaths > 0 && ctx.totalDeaths % MULTIPLE_DEATHS_INTERVAL === 0) return 'multiple_deaths';
    return 'general';
  }

  commentOnDeath(ctx: DeathCommentContext, rng: () => number = Math.random): DialogueLine {
    return this.emitFrom(this.resolveDeathCategory(ctx), rng);
  }

  commentOnAdaptation(rng: () => number = Math.random): DialogueLine {
    return this.emitFrom('successful_adaptation', rng);
  }

  /** Returns null below the threshold — not every attempt start deserves a line. */
  commentOnHesitation(hesitationMs: number, rng: () => number = Math.random): DialogueLine | null {
    if (hesitationMs < HESITATION_THRESHOLD_MS) return null;
    return this.emitFrom('long_hesitation', rng);
  }

  private emitFrom(category: CommentCategory, rng: () => number): DialogueLine {
    const pool = DIALOGUE_POOLS[category];
    const candidates = pool.filter((line) => !this.recentLineIds.includes(line.id));
    const options = candidates.length > 0 ? candidates : pool;
    const chosen = options[Math.floor(rng() * options.length)] as DialogueLine;

    this.recentLineIds.push(chosen.id);
    if (this.recentLineIds.length > RECENT_HISTORY_SIZE) this.recentLineIds.shift();

    EventBus.emit('system:comment', { text: chosen[LocaleState.current], category });
    return chosen;
  }
}

export const Commentator = new CommentatorStore();
