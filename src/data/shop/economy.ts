/**
 * Free CREDITS sources actually backed by state this project already tracks
 * (`level:completed` event, `GameState.run.deaths`, `AdsService` rewarded
 * flow) — master-prompt §3's full list also names new-best/secret/
 * achievement/Daily-Challenge/perfect-run, but none of that infra exists yet
 * (no best-time tracking, no achievements, no Daily Challenge), so those are
 * left out here rather than faked. Add a source only once its trigger is
 * real (`TODO.md` tracks the deferred ones).
 */
export const EARN_AMOUNTS = {
  levelComplete: 10,
  sectorComplete: 25,
  zeroDeaths: 10,
  rewardedAd: 20,
} as const;

export type CreditEarnReason =
  | 'level_complete'
  | 'sector_complete'
  | 'zero_deaths'
  | 'rewarded_ad'
  | 'purchase'
  /** A star earned for the first time — see `STAR_CREDITS` in `gameplay/stars.ts`, which owns the amount because it owns the rule. */
  | 'star'
  | 'dev';
export type CreditSpendReason = 'shop_item' | 'dev';
