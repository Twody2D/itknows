/**
 * In-memory session state for the current run. Persisted progress lives in
 * SaveService (Phase 6) — this is transient and reset on reload.
 */
export interface RunStats {
  deaths: number;
  startedAtMs: number;
}

class GameStateStore {
  currentSectorId = 'sector-01';
  currentLevelId = 'sector-01-level-01';
  currentVariantId = 'base';

  run: RunStats = { deaths: 0, startedAtMs: 0 };

  /** Same shape as `run`, but reset only at the first level of a sector — feeds the Sector Complete screen's totals. */
  sector: RunStats = { deaths: 0, startedAtMs: 0 };

  startRun(): void {
    this.run = { deaths: 0, startedAtMs: performance.now() };
  }

  startSector(): void {
    this.sector = { deaths: 0, startedAtMs: performance.now() };
  }

  registerDeath(): void {
    this.run.deaths += 1;
    this.sector.deaths += 1;
  }

  elapsedMs(): number {
    return performance.now() - this.run.startedAtMs;
  }

  sectorElapsedMs(): number {
    return performance.now() - this.sector.startedAtMs;
  }
}

export const GameState = new GameStateStore();
