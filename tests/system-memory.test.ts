import { beforeEach, describe, expect, it } from 'vitest';
import { SystemMemory } from '@/ai/SystemMemory';

describe('SystemMemory', () => {
  beforeEach(() => {
    SystemMemory.reset();
  });

  it('starts with no history', () => {
    const m = SystemMemory.snapshot();
    expect(m.lastDeathType).toBeNull();
    expect(m.repeatDeathCount).toBe(0);
    expect(m.currentStreak).toBe(0);
  });

  it('counts consecutive deaths on the same level with the same cause', () => {
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(1);
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(2);
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(3);
  });

  it('resets the repeat count when the cause changes', () => {
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-a', 'spike', null);
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(1);
  });

  it('resets the repeat count when the level changes', () => {
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-b', 'trap', 'laser-02');
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(1);
  });

  it('a death always resets the streak to 0', () => {
    SystemMemory.registerClear('level-a', false);
    SystemMemory.registerClear('level-a', false);
    expect(SystemMemory.snapshot().currentStreak).toBe(2);
    SystemMemory.registerDeath('level-a', 'fall', null);
    expect(SystemMemory.snapshot().currentStreak).toBe(0);
  });

  it('a clear increments the streak and clears repeatDeathCount', () => {
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerClear('level-a', true);
    const m = SystemMemory.snapshot();
    expect(m.repeatDeathCount).toBe(0);
    expect(m.currentStreak).toBe(1);
  });

  it('recentSuccessfulAdaptation reflects whether the clear followed a struggle', () => {
    SystemMemory.registerClear('level-a', false);
    expect(SystemMemory.snapshot().recentSuccessfulAdaptation).toBe(false);
    SystemMemory.registerClear('level-a', true);
    expect(SystemMemory.snapshot().recentSuccessfulAdaptation).toBe(true);
  });

  it('a death after a clear does not inherit the pre-clear repeat streak', () => {
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    SystemMemory.registerClear('level-a', true);
    SystemMemory.registerDeath('level-a', 'trap', 'laser-01');
    expect(SystemMemory.snapshot().repeatDeathCount).toBe(1);
  });
});
