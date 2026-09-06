import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardService } from '@/services/LeaderboardService';
import { YandexGamesService } from '@/services/YandexGamesService';

vi.mock('@/services/YandexGamesService', () => ({
  YandexGamesService: {
    submitScore: vi.fn(async () => undefined),
    getLeaderboardEntries: vi.fn(async () => []),
    getPlayerLeaderboardEntry: vi.fn(async () => null),
  },
}));

describe('LeaderboardService', () => {
  beforeEach(() => {
    vi.mocked(YandexGamesService.submitScore).mockClear();
    vi.mocked(YandexGamesService.getLeaderboardEntries).mockClear();
    vi.mocked(YandexGamesService.getPlayerLeaderboardEntry).mockClear();
  });

  it('submits a canonical ("standard") variant time to that level\'s board', async () => {
    await LeaderboardService.submitLevelScore('sector-01-level-01', 12345, 'standard');
    expect(YandexGamesService.submitScore).toHaveBeenCalledWith('level-sector-01-level-01', 12345);
  });

  it('never submits an adaptive variant\'s time — not a fair cross-player comparison', async () => {
    await LeaderboardService.submitLevelScore('sector-01-level-01', 12345, 'gentle');
    await LeaderboardService.submitLevelScore('sector-01-level-01', 12345, 'bold');
    await LeaderboardService.submitLevelScore('sector-01-level-01', 12345, 'troll');
    expect(YandexGamesService.submitScore).not.toHaveBeenCalled();
  });

  it('rounds the submitted score to a whole millisecond', async () => {
    await LeaderboardService.submitLevelScore('sector-01-level-01', 999.7, 'standard');
    expect(YandexGamesService.submitScore).toHaveBeenCalledWith('level-sector-01-level-01', 1000);
  });

  it('reads a level\'s entries by its own leaderboard name', async () => {
    await LeaderboardService.getLevelEntries('sector-02-level-03', 5);
    expect(YandexGamesService.getLeaderboardEntries).toHaveBeenCalledWith('level-sector-02-level-03', 5);
  });

  it('reads the current player\'s entry by the same leaderboard name', async () => {
    await LeaderboardService.getPlayerLevelEntry('sector-02-level-03');
    expect(YandexGamesService.getPlayerLeaderboardEntry).toHaveBeenCalledWith('level-sector-02-level-03');
  });

  it('submits a sector time unconditionally, not gated on a canonical variant', async () => {
    await LeaderboardService.submitSectorScore('sector-01', 60000.4);
    expect(YandexGamesService.submitScore).toHaveBeenCalledWith('sector-sector-01', 60000);
  });

  it('reads a sector\'s entries and the player\'s own by its own leaderboard name', async () => {
    await LeaderboardService.getSectorEntries('sector-01', 5);
    expect(YandexGamesService.getLeaderboardEntries).toHaveBeenCalledWith('sector-sector-01', 5);
    await LeaderboardService.getPlayerSectorEntry('sector-01');
    expect(YandexGamesService.getPlayerLeaderboardEntry).toHaveBeenCalledWith('sector-sector-01');
  });
});
