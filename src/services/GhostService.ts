import { SaveService } from './SaveService';
import type { GhostRecord } from './SaveService';

function ghostKey(levelId: string, variantId: string): string {
  return `${levelId}::${variantId}`;
}

/**
 * Wraps `SaveService`'s opaque ghost storage with the one policy the feature
 * needs: a ghost is scoped to `(levelId, variantId)`, not just `levelId` —
 * variants differ in geometry (CLAUDE.md #4.3), so a `bold` run's trace
 * would clip through walls replayed inside `gentle` geometry. Unlike
 * `LeaderboardService`, there is no canonical-variant restriction here —
 * every variant a player actually beats earns its own ghost.
 */
class GhostServiceController {
  /** Fewer than two samples can't be interpolated into motion (`GhostSprite` would just flash once and vanish) — `SaveService.saveGhostIfBest` already no-ops for a non-improving time. */
  recordAttempt(levelId: string, variantId: string, timeMs: number, samples: readonly number[]): void {
    if (samples.length < 8) return;
    SaveService.saveGhostIfBest(ghostKey(levelId, variantId), timeMs, samples);
  }

  getGhost(levelId: string, variantId: string): GhostRecord | null {
    return SaveService.getGhost(ghostKey(levelId, variantId));
  }
}

export const GhostService = new GhostServiceController();
