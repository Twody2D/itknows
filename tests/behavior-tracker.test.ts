import { afterEach, describe, expect, it } from 'vitest';
import { BehaviorTracker } from '@/ai/BehaviorTracker';
import { EventBus } from '@/core/EventBus';

describe('BehaviorTracker', () => {
  let tracker: BehaviorTracker | undefined;

  afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
  });

  it('accumulates left/right hold time and total active time while alive', () => {
    tracker = new BehaviorTracker();
    tracker.sample(0, 100, { left: true, right: false }, true);
    tracker.sample(100, 100, { left: false, right: true }, true);
    tracker.sample(200, 100, { left: false, right: false }, true);

    const summary = tracker.finish(null, true);
    expect(summary.leftMs).toBe(100);
    expect(summary.rightMs).toBe(100);
    expect(summary.activeMs).toBe(300);
  });

  it('ignores samples while the player is not alive', () => {
    tracker = new BehaviorTracker();
    tracker.sample(0, 500, { left: true, right: false }, false);
    const summary = tracker.finish('spike', false);
    expect(summary.activeMs).toBe(0);
  });

  it('accumulates hesitation time until the first input, then freezes it', () => {
    tracker = new BehaviorTracker();
    tracker.sample(0, 500, { left: false, right: false }, true);
    expect(tracker.hesitationSoFarMs).toBe(500);
    tracker.sample(500, 500, { left: true, right: false }, true);
    expect(tracker.hesitationSoFarMs).toBe(500);
    tracker.sample(1000, 1000, { left: false, right: false }, true);
    expect(tracker.hesitationSoFarMs).toBe(500);
  });

  it('counts a jump via the player:jumped event', () => {
    tracker = new BehaviorTracker();
    EventBus.emit('player:jumped', undefined);
    EventBus.emit('player:jumped', undefined);
    expect(tracker.finish(null, true).jumps).toBe(2);
  });

  it('measures reaction time from trap:armed to the next jump', () => {
    tracker = new BehaviorTracker();
    tracker.sample(0, 0, { left: false, right: false }, true);
    EventBus.emit('trap:armed', { trapId: 'laser-01' });
    tracker.sample(300, 300, { left: false, right: false }, true);
    EventBus.emit('player:jumped', undefined);

    const summary = tracker.finish(null, true);
    expect(summary.reactionSamplesMs).toEqual([300]);
  });

  it('drops a warning nobody ever reacted to instead of recording a huge reaction time', () => {
    tracker = new BehaviorTracker();
    tracker.sample(0, 0, { left: false, right: false }, true);
    EventBus.emit('trap:armed', { trapId: 'laser-01' });
    tracker.sample(5000, 5000, { left: false, right: false }, true);
    EventBus.emit('player:jumped', undefined);

    expect(tracker.finish(null, true).reactionSamplesMs).toEqual([]);
  });

  it('charges one unsurvived risk encounter on a trap death, all of them otherwise', () => {
    tracker = new BehaviorTracker();
    EventBus.emit('trap:triggered', { trapId: 'laser-01' });
    EventBus.emit('trap:triggered', { trapId: 'laser-01' });

    const trapDeath = tracker.finish('trap', false);
    expect(trapDeath.riskEncounters).toBe(2);
    expect(trapDeath.riskSurvived).toBe(1);
  });

  it('counts all risk encounters as survived on a non-trap death or a clear', () => {
    tracker = new BehaviorTracker();
    EventBus.emit('trap:triggered', { trapId: 'laser-01' });
    EventBus.emit('trap:triggered', { trapId: 'laser-01' });

    const cleared = tracker.finish(null, true);
    expect(cleared.riskEncounters).toBe(2);
    expect(cleared.riskSurvived).toBe(2);
  });

  it('destroy() unsubscribes — later events no longer affect a destroyed tracker', () => {
    tracker = new BehaviorTracker();
    tracker.destroy();
    EventBus.emit('player:jumped', undefined);
    // finish() after destroy() still works (no crash) and reflects state at destroy time.
    expect(tracker.finish(null, true).jumps).toBe(0);
    tracker = undefined;
  });
});
