/**
 * Holds THE SYSTEM's current on-screen line across a scene restart.
 *
 * `GameplayScene` rebuilds its whole HUD (including the text object showing
 * this line) on every `scene.restart()` — which happens ~450ms after a
 * death (CLAUDE.md #5's <700ms restart budget), well before a comment's
 * intended ~2.5s display time is up. Without this, the line would flash for
 * under half a second and vanish the instant the new scene's fresh HUD
 * replaces the old one. Storing the deadline here (using wall-clock time,
 * not Phaser's per-scene `time.now` which resets to 0 on every restart)
 * lets the *next* scene instance pick up display right where the old one
 * left off, so the total time on screen actually matches what `GameplayScene`
 * asked for.
 */
class SystemVoiceState {
  text = '';
  category = '';
  private expiresAtMs = 0;

  show(text: string, category: string, durationMs: number): void {
    this.text = text;
    this.category = category;
    this.expiresAtMs = performance.now() + durationMs;
  }

  /** Text to display right now, or '' if nothing is currently live. */
  current(): string {
    return performance.now() < this.expiresAtMs ? this.text : '';
  }

  /**
   * Category of the line on screen right now, or '' if nothing is live.
   *
   * Exists so a caller can ask what it would be interrupting. The sector
   * premise is the one line in the game that is not a reaction — it is the
   * sector introducing itself, said once and never again — and standing
   * still for two seconds on the first screen was enough for an ambient
   * remark about standing still to wipe it out mid-read.
   */
  currentCategory(): string {
    return performance.now() < this.expiresAtMs ? this.category : '';
  }
}

export const SystemVoice = new SystemVoiceState();
