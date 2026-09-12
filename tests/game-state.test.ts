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

describe('GameState clock while paused', () => {
  const advance = (ms: number): void => {
    const until = performance.now() + ms;
    while (performance.now() < until) {
      /* spin: the clock reads the real `performance.now()`, so the only way
         to move it is to let real time pass */
    }
  };

  it('holds the reading steady for as long as the game is paused', () => {
    GameState.startRun();
    advance(6);
    GameState.pauseClock();
    const frozen = GameState.elapsedMs();
    advance(12);
    expect(GameState.elapsedMs()).toBe(frozen);
  });

  it('does not count paused time once the game resumes', () => {
    GameState.startRun();
    GameState.startSector();
    advance(4);
    GameState.pauseClock();
    const atPause = GameState.elapsedMs();
    const sectorAtPause = GameState.sectorElapsedMs();
    advance(30);
    GameState.resumeClock();
    // Only the few ms this line takes may have been added — never the 30
    // spent paused.
    expect(GameState.elapsedMs()).toBeLessThan(atPause + 20);
    expect(GameState.sectorElapsedMs()).toBeLessThan(sectorAtPause + 20);
  });

  it('ignores a second pause and a resume that was never paused', () => {
    GameState.startRun();
    GameState.pauseClock();
    const frozen = GameState.elapsedMs();
    advance(8);
    GameState.pauseClock();
    expect(GameState.elapsedMs()).toBe(frozen);

    GameState.resumeClock();
    GameState.resumeClock();
    expect(GameState.elapsedMs()).toBeLessThan(frozen + 20);
  });

  it('starts a fresh run from the moment the pause ends', () => {
    GameState.startRun();
    advance(5);
    GameState.pauseClock();
    advance(25);
    // The order `PauseScene.restart` produces: the new run is started while
    // the clock is still held, and the shutdown that follows releases it.
    GameState.startRun();
    GameState.resumeClock();
    expect(GameState.elapsedMs()).toBeLessThan(20);
  });
});
