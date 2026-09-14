import { SaveService } from './SaveService';
import type { GhostRecord } from './SaveService';

/**
 * Wraps `SaveService`'s opaque ghost storage with the one policy the feature
 * needs: one best-run trace per level.
 *
 * It used to be keyed by `(levelId, variantId)`, because the adaptive
 * variants differed in geometry and a trace recorded in one would have
 * replayed through walls in another. That layer is gone — every player gets
 * the one shape of each level now (`LevelFactory`) — so the level id is the
 * whole key, and `SaveService` migrates the old `id::standard` keys onto it.
 */
class GhostServiceController {
  /** Fewer than two samples can't be interpolated into motion (`GhostSprite` would just flash once and vanish) — `SaveService.saveGhostIfBest` already no-ops for a non-improving time. */
  recordAttempt(levelId: string, timeMs: number, samples: readonly number[]): void {
    if (samples.length < 8) return;
    SaveService.saveGhostIfBest(levelId, timeMs, samples);
  }

  getGhost(levelId: string): GhostRecord | null {
    return SaveService.getGhost(levelId);
  }
}

export const GhostService = new GhostServiceController();
