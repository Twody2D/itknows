/**
 * In-memory session state for the current run. Persisted progress lives in
 * SaveService (Phase 6) — this is transient and reset on reload.
 */
export interface RunStats {
  deaths: number;
  startedAtMs: number;
  /** Wall-clock time already spent paused, subtracted from every reading of this clock. */
  pausedMs: number;
}

class GameStateStore {
  /**
   * Empty until a level is actually entered, for the same reason
   * `currentLevelId` is — a non-empty starting value makes the "did the
   * sector change?" test answer no on the very first level of the session.
   */
  currentSectorId = '';
  /**
   * Empty until a level is actually entered. It used to start out naming the
   * first level of the campaign, which is the level a fresh save resumes on
   * — so `GameplayScene.create`'s "did the level change?" test said no on the
   * very first run of the session and never started the clock. The attempt
   * timer then counted from page load, and the pause card showed a minute
   * against a HUD reading five seconds.
   */
  currentLevelId = '';

  run: RunStats = { deaths: 0, startedAtMs: 0, pausedMs: 0 };

  /** Same shape as `run`, but reset only at the first level of a sector — feeds the Sector Complete screen's totals. */
  sector: RunStats = { deaths: 0, startedAtMs: 0, pausedMs: 0 };

  /** `performance.now()` at which the clock was stopped, or 0 while it runs. */
  private pausedAtMs = 0;

  startRun(): void {
    this.run = { deaths: 0, startedAtMs: this.nowMs(), pausedMs: 0 };
  }

  startSector(): void {
    this.sector = { deaths: 0, startedAtMs: this.nowMs(), pausedMs: 0 };
  }

  registerDeath(): void {
    this.run.deaths += 1;
    this.sector.deaths += 1;
  }

  /**
   * Stops both clocks for as long as the game is paused.
   *
   * They are wall clocks (`performance.now()`), not Phaser clocks, because
   * they have to survive a `scene.start` from one level to the next — which
   * means nothing about pausing a scene stops them on its own, and the
   * attempt timer on the pause card kept counting up while the player was
   * reading it. Time spent paused belongs to neither the attempt nor the
   * sector record: both are claims about how fast the level was played.
   */
  pauseClock(): void {
    if (this.pausedAtMs !== 0) return;
    this.pausedAtMs = performance.now();
  }

  resumeClock(): void {
    if (this.pausedAtMs === 0) return;
    const held = performance.now() - this.pausedAtMs;
    this.pausedAtMs = 0;
    this.run.pausedMs += held;
    this.sector.pausedMs += held;
  }

  elapsedMs(): number {
    return this.nowMs() - this.run.startedAtMs - this.run.pausedMs;
  }

  sectorElapsedMs(): number {
    return this.nowMs() - this.sector.startedAtMs - this.sector.pausedMs;
  }

  /** Frozen at the moment of the pause, so a reading taken while paused never drifts. */
  private nowMs(): number {
    return this.pausedAtMs === 0 ? performance.now() : this.pausedAtMs;
  }
}

export const GameState = new GameStateStore();
