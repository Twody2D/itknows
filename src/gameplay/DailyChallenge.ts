import { stringHash } from '@/art/hash';
import { YandexGamesService } from '@/services/YandexGamesService';
import { getAllLevels } from './LevelFactory';

/**
 * The one variant a Daily Challenge run is ever played in — same fairness
 * reasoning as `LeaderboardService`'s canonical-variant gate: an adaptive
 * variant is picked from *this player's own* recent behavior, so it isn't
 * the same challenge for two different players even on the same day.
 */
export const DAILY_CHALLENGE_VARIANT_ID = 'standard';

/**
 * UTC calendar date as `YYYY-MM-DD` — the one clock reading every device
 * has to agree on for "the same seed gives the same challenge"
 * (master-prompt §72) to actually mean the same day regardless of the
 * player's own timezone. Using the device's local calendar date instead
 * would hand players in different timezones different levels at the same
 * moment, which isn't "daily", it's "timezone-dependent".
 */
export function dailyChallengeDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * `ysdk.serverTime()` when available — resistant to a tampered device clock
 * (verified against the docs, `docs/yandex-games.md`) — falls back to
 * `Date.now()` outside a real SDK, same degrade contract as the rest of
 * `YandexGamesService`. A guest cheating their own clock in the fallback
 * case only ever shifts which day *they* see, never anyone else's.
 */
export function currentChallengeTimeMs(): number {
  return YandexGamesService.getServerTime() ?? Date.now();
}

export interface DailyChallengeDef {
  date: string;
  levelId: string;
}

/**
 * Deterministic from the date alone (CLAUDE.md #6 — no RNG in gameplay,
 * everything derives from a fixed input): every player who asks "what's
 * today's challenge" on the same UTC date gets the exact same level, always
 * played in the canonical variant. `stringHash` is the same FNV-1a already
 * used to turn a level id into a seed for decorative art placement
 * (`art/hash.ts`) — reused here instead of a second hash implementation.
 */
export function getDailyChallenge(nowMs: number = currentChallengeTimeMs()): DailyChallengeDef {
  const date = dailyChallengeDateKey(nowMs);
  const levels = getAllLevels();
  const index = stringHash(date) % levels.length;
  const level = levels[index];
  if (!level) throw new Error('DailyChallenge: campaign has no levels');
  return { date, levelId: level.id };
}
