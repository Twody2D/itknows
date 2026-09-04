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
        save: JSON.stringify({
          version: 2,
          completedLevels: ['sector-01-level-01'],
          lastLevelId: null,
          credits: 0,
          inventory: {
            ownedSkins: ['default'],
            ownedDeathFx: ['static'],
            ownedSystemPacks: ['standard'],
            ownedPremium: [],
            equippedSkin: 'default',
            equippedDeathFx: 'static',
            equippedSystemPack: 'standard',
          },
          processedPurchaseTokens: [],
        }),
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

    it('migrates a v1 cloud save forward with fresh shop defaults instead of dropping it', async () => {
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({ version: 1, completedLevels: ['sector-01-level-01'], lastLevelId: 'sector-01-level-02' }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getCompletedLevels()).toEqual(['sector-01-level-01']);
      expect(SaveService.getCredits()).toBe(0);
      expect(SaveService.getInventory().equippedSkin).toBe('default');
    });

    it('never lets a merge regress credits or owned cosmetics', async () => {
      SaveService.setCredits(50);
      SaveService.setInventory({ ...SaveService.getInventory(), ownedSkins: ['default', 'void'] });
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({
          version: 2,
          completedLevels: [],
          lastLevelId: null,
          credits: 20,
          inventory: {
            ownedSkins: ['default', 'signal'],
            ownedDeathFx: ['static'],
            ownedSystemPacks: ['standard'],
            ownedPremium: ['remove_ads'],
            equippedSkin: 'default',
            equippedDeathFx: 'static',
            equippedSystemPack: 'standard',
          },
          processedPurchaseTokens: ['tok-1'],
        }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getCredits()).toBe(50);
      expect(SaveService.getInventory().ownedSkins.slice().sort()).toEqual(['default', 'signal', 'void']);
      expect(SaveService.getInventory().ownedPremium).toEqual(['remove_ads']);
      expect(SaveService.hasProcessedPurchase('tok-1')).toBe(true);
    });
  });

  describe('shop fields', () => {
    it('starts a fresh save with zero credits and only the free defaults owned/equipped', () => {
      expect(SaveService.getCredits()).toBe(0);
      expect(SaveService.getInventory()).toEqual({
        ownedSkins: ['default'],
        ownedDeathFx: ['static'],
        ownedSystemPacks: ['standard'],
        ownedPremium: [],
        equippedSkin: 'default',
        equippedDeathFx: 'static',
        equippedSystemPack: 'standard',
      });
    });

    it('round-trips credits and inventory writes', () => {
      SaveService.setCredits(120);
      expect(SaveService.getCredits()).toBe(120);

      const inventory = { ...SaveService.getInventory(), ownedSkins: ['default', 'void'], equippedSkin: 'void' };
      SaveService.setInventory(inventory);
      expect(SaveService.getInventory()).toEqual(inventory);
    });

    it('tracks processed purchase tokens without duplicates', () => {
      SaveService.markPurchaseProcessed('tok-abc');
      SaveService.markPurchaseProcessed('tok-abc');
      expect(SaveService.hasProcessedPurchase('tok-abc')).toBe(true);
      expect(SaveService.hasProcessedPurchase('tok-other')).toBe(false);
    });
  });
});
