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

/**
 * The sector counters survive a retry; only a different sector clears them.
 *
 * `GameplayScene.create` used to call `startSector()` whenever the level id
 * ended in `-level-01`, and `create()` runs again on every death-restart —
 * so every death on the first level of a sector wiped the sector's own
 * totals, and the Sector Complete screen reported none of them. Measured
 * live on BOOT: four deaths, `sector.deaths` still 0, while `run.deaths`
 * counted 1-2-3-4 correctly. The owner saw the half that shows: "смерти
 * неправильно считаются, то ли от ловушек, то ли от падения не засчитывает"
 * — the cause was never the cause of death, it was which level he was on.
 *
 * The scene now compares `sectorIdOf(levelId)` against
 * `GameState.currentSectorId`, the same shape of test `startRun()` already
 * used for the level. These cover the store's half of that contract.
 */
describe('GameState sector totals', () => {
  it('keeps counting deaths across restarts of the same level', () => {
    GameState.startSector();
    GameState.registerDeath();
    GameState.registerDeath();
    // A death-restart re-enters the scene; nothing about the sector changed.
    GameState.startRun();
    GameState.registerDeath();
    expect(GameState.run.deaths).toBe(1);
    expect(GameState.sector.deaths).toBe(3);
  });

  it('clears only when a new sector actually starts', () => {
    GameState.startSector();
    GameState.registerDeath();
    GameState.registerDeath();
    expect(GameState.sector.deaths).toBe(2);
    GameState.startSector();
    expect(GameState.sector.deaths).toBe(0);
  });

  it('names no sector until a level is entered, so the first one counts as a change', () => {
    // A non-empty default made the "did the sector change?" test answer no
    // on the very first level of the session — the same trap
    // `currentLevelId` documents.
    expect(GameState.currentSectorId).not.toBe('sector-01');
  });
});
