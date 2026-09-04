import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { SaveService } from '@/services/SaveService';
import { YandexGamesService } from '@/services/YandexGamesService';

vi.mock('@/services/YandexGamesService', () => ({
  YandexGamesService: {
    isAvailable: vi.fn(() => false),
    getPlayerData: vi.fn(async () => null),
    setPlayerData: vi.fn(async () => undefined),
  },
}));

describe('SaveService', () => {
  beforeEach(() => {
    SaveService.resetForTests();
    vi.mocked(YandexGamesService.isAvailable).mockReturnValue(false);
    vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue(null);
    vi.mocked(YandexGamesService.setPlayerData).mockClear();
  });

  it('resumes at the campaign\'s first level with no save yet', () => {
    expect(SaveService.getResumeLevelId()).toBe(getAllLevels()[0]!.id);
  });

  it('remembers the level last opened as the resume point', () => {
    SaveService.setLastLevelId('sector-02-level-03');
    expect(SaveService.getResumeLevelId()).toBe('sector-02-level-03');
  });

  it('tracks completed levels without duplicates', () => {
    SaveService.markCompleted('sector-01-level-01');
    SaveService.markCompleted('sector-01-level-01');
    expect(SaveService.getCompletedLevels()).toEqual(['sector-01-level-01']);
    expect(SaveService.isCompleted('sector-01-level-01')).toBe(true);
    expect(SaveService.isCompleted('sector-01-level-02')).toBe(false);
  });

  it('never touches the cloud when the SDK is unavailable', async () => {
    SaveService.markCompleted('sector-01-level-01');
    await SaveService.syncWithCloud();
    expect(YandexGamesService.setPlayerData).not.toHaveBeenCalled();
  });

  describe('cloud sync (SDK available, authorized player)', () => {
    beforeEach(() => {
      vi.mocked(YandexGamesService.isAvailable).mockReturnValue(true);
    });

    it('adopts the cloud save wholesale on a brand-new local device', async () => {
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({ version: 1, completedLevels: ['sector-01-level-01'], lastLevelId: 'sector-01-level-02' }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getCompletedLevels()).toEqual(['sector-01-level-01']);
      expect(SaveService.getResumeLevelId()).toBe('sector-01-level-02');
    });

    it('unions completed levels instead of letting either side regress', async () => {
      SaveService.markCompleted('sector-01-level-02');
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({ version: 1, completedLevels: ['sector-01-level-01'], lastLevelId: null }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getCompletedLevels().slice().sort()).toEqual(['sector-01-level-01', 'sector-01-level-02']);
    });

    it('keeps this device\'s own lastLevelId over the cloud\'s when it already has one', async () => {
      SaveService.setLastLevelId('sector-01-level-03');
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({ version: 1, completedLevels: [], lastLevelId: 'sector-01-level-01' }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getResumeLevelId()).toBe('sector-01-level-03');
    });

    it('pushes the local save to the cloud after completing a level', () => {
      SaveService.markCompleted('sector-01-level-01');
      expect(YandexGamesService.setPlayerData).toHaveBeenCalledWith({
        save: JSON.stringify({ version: 1, completedLevels: ['sector-01-level-01'], lastLevelId: null }),
      });
    });

    it('ignores an unparseable cloud save instead of wiping local progress', async () => {
      SaveService.markCompleted('sector-01-level-01');
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({ save: 'not json' });
      await SaveService.syncWithCloud();
      expect(SaveService.getCompletedLevels()).toEqual(['sector-01-level-01']);
    });

    it('only syncs once — a second call is a no-op', async () => {
      await SaveService.syncWithCloud();
      vi.mocked(YandexGamesService.getPlayerData).mockClear();
      await SaveService.syncWithCloud();
      expect(YandexGamesService.getPlayerData).not.toHaveBeenCalled();
    });
  });
});
