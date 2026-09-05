/** ~8Hz — smooth enough to interpolate between (`GhostSprite`), coarse enough to stay compact (master-prompt §40: no video, just a small sample set). */
const SAMPLE_INTERVAL_MS = 120;

/** 500 samples × 120ms ≈ 60s of trace — a safety ceiling against an unexpectedly long attempt bloating the save, not a limit any normally-paced level should ever reach. */
const MAX_SAMPLES = 500;

/**
 * Records one attempt's position trace as a flat `[t, x, y, facing]×N`
 * array — same instance reused across scene restarts (`GameplayScene`
 * survives a death-retry), so `reset()` must run at the start of every
 * attempt. Pure logic, no Phaser dependency: the scene feeds in whatever
 * clock/position it already tracks each frame.
 */
export class GhostRecorder {
  private samples: number[] = [];
  private lastSampleMs = -Infinity;

  reset(): void {
    this.samples = [];
    this.lastSampleMs = -Infinity;
  }

  sample(elapsedMs: number, x: number, y: number, flipX: boolean): void {
    if (elapsedMs - this.lastSampleMs < SAMPLE_INTERVAL_MS) return;
    if (this.samples.length >= MAX_SAMPLES * 4) return;
    this.lastSampleMs = elapsedMs;
    this.samples.push(Math.round(elapsedMs), Math.round(x), Math.round(y), flipX ? 1 : 0);
  }

  finish(): readonly number[] {
    return this.samples;
  }
}
