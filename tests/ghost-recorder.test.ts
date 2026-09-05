import { describe, expect, it } from 'vitest';
import { GhostRecorder } from '@/gameplay/GhostRecorder';

describe('GhostRecorder', () => {
  it('produces an empty trace before any sample', () => {
    const recorder = new GhostRecorder();
    expect(recorder.finish()).toEqual([]);
  });

  it('records the first sample regardless of elapsed time', () => {
    const recorder = new GhostRecorder();
    recorder.sample(0, 10, 20, false);
    expect(recorder.finish()).toEqual([0, 10, 20, 0]);
  });

  it('skips samples that arrive before the next interval', () => {
    const recorder = new GhostRecorder();
    recorder.sample(0, 0, 0, false);
    recorder.sample(30, 5, 5, false);
    recorder.sample(60, 9, 9, false);
    expect(recorder.finish()).toEqual([0, 0, 0, 0]);
  });

  it('accepts a sample once the interval has passed, encoding facing as 0/1', () => {
    const recorder = new GhostRecorder();
    recorder.sample(0, 0, 0, false);
    recorder.sample(120, 15, 25, true);
    expect(recorder.finish()).toEqual([0, 0, 0, 0, 120, 15, 25, 1]);
  });

  it('rounds fractional positions and timestamps to whole numbers', () => {
    const recorder = new GhostRecorder();
    recorder.sample(0.4, 10.6, 20.5, false);
    expect(recorder.finish()).toEqual([0, 11, 21, 0]);
  });

  it('reset() clears the trace and the interval gate so a fresh attempt starts clean', () => {
    const recorder = new GhostRecorder();
    recorder.sample(0, 1, 1, false);
    recorder.sample(120, 2, 2, false);
    recorder.reset();
    expect(recorder.finish()).toEqual([]);
    recorder.sample(0, 9, 9, true);
    expect(recorder.finish()).toEqual([0, 9, 9, 1]);
  });

  it('stops growing past the sample cap instead of recording forever', () => {
    const recorder = new GhostRecorder();
    for (let t = 0; t < 500 * 120 + 1000; t += 120) {
      recorder.sample(t, t, t, false);
    }
    expect(recorder.finish().length).toBe(500 * 4);
  });
});
