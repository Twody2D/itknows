import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';

describe('GameState', () => {
  it('resets deaths and start time on startRun', () => {
    GameState.registerDeath();
    GameState.registerDeath();
    expect(GameState.run.deaths).toBeGreaterThan(0);

    GameState.startRun();
    expect(GameState.run.deaths).toBe(0);
  });

  it('accumulates deaths across multiple registrations', () => {
    GameState.startRun();
    GameState.registerDeath();
    GameState.registerDeath();
    GameState.registerDeath();
    expect(GameState.run.deaths).toBe(3);
  });

  it('reports non-negative elapsed time after starting a run', () => {
    GameState.startRun();
    expect(GameState.elapsedMs()).toBeGreaterThanOrEqual(0);
  });
});
