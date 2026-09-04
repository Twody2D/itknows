import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicSequencer } from '@/audio/MusicSequencer';

/**
 * `AudioContext` doesn't exist under Vitest's `node` environment (see
 * `AudioEngine`'s doc comment), so `AudioEngine.playTone` silently no-ops
 * here — this only exercises the mood state machine and its loop-boundary
 * timer, not real audio output (same testing-scope split as `sfx-manager
 * .test.ts`).
 */
describe('MusicSequencer', () => {
  beforeEach(() => {
    // `performance` must be explicitly included — it's not one of Vitest's
    // default faked globals, and `MusicSequencer` times its tension window
    // off `performance.now()`, not `Date.now()`.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  });

  afterEach(() => {
    MusicSequencer.stop();
    vi.useRealTimers();
  });

  it('starts in the calm mood', () => {
    MusicSequencer.start();
    expect(MusicSequencer.getCurrentMood()).toBe('calm');
  });

  it('picks up a requested tension mood at the next loop boundary, not immediately', () => {
    MusicSequencer.start();
    MusicSequencer.requestTension();
    expect(MusicSequencer.getCurrentMood()).toBe('calm');

    vi.advanceTimersByTime(4000); // longer than one calm loop (4 beats @ 88bpm ≈ 2.7s)
    expect(MusicSequencer.getCurrentMood()).toBe('tension');
  });

  it('reverts to calm once tension is not renewed past its hold window', () => {
    MusicSequencer.start();
    MusicSequencer.requestTension();
    vi.advanceTimersByTime(4000);
    expect(MusicSequencer.getCurrentMood()).toBe('tension');

    // Advance well past TENSION_HOLD_MS (4000ms) with no renewal — the next
    // tension loop boundary should fall back to calm.
    vi.advanceTimersByTime(10_000);
    expect(MusicSequencer.getCurrentMood()).toBe('calm');
  });

  it('renewing requestTension before it lapses keeps tension going', () => {
    MusicSequencer.start();
    MusicSequencer.requestTension();
    vi.advanceTimersByTime(4000);
    expect(MusicSequencer.getCurrentMood()).toBe('tension');

    // Renew partway through the hold window, then advance past the original deadline.
    vi.advanceTimersByTime(2000);
    MusicSequencer.requestTension();
    vi.advanceTimersByTime(3000);
    expect(MusicSequencer.getCurrentMood()).toBe('tension');
  });

  it('celebrateVictory switches mood immediately and does not keep looping', () => {
    MusicSequencer.start();
    MusicSequencer.celebrateVictory();
    expect(MusicSequencer.getCurrentMood()).toBe('victory');

    // A one-shot pattern schedules no further timer — advancing time should
    // not throw or silently revert the mood.
    vi.advanceTimersByTime(20_000);
    expect(MusicSequencer.getCurrentMood()).toBe('victory');
  });

  it('stop() cancels the pending loop timer and clears the mood', () => {
    MusicSequencer.start();
    MusicSequencer.stop();
    expect(MusicSequencer.getCurrentMood()).toBeNull();

    // No pending timer should fire and resurrect a mood.
    vi.advanceTimersByTime(20_000);
    expect(MusicSequencer.getCurrentMood()).toBeNull();
  });
});
