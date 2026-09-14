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
          version: 7,
          completedLevels: ['sector-01-level-01'],
          lastLevelId: null,
          credits: 0,
          inventory: {
            ownedSkins: ['default'],
            ownedDeathFx: ['static'],
            ownedSystemPacks: ['standard'],
            ownedTrails: ['data_trail'],
            ownedPremium: [],
            equippedSkin: 'default',
            equippedDeathFx: 'static',
            equippedSystemPack: 'standard',
            equippedTrail: 'data_trail',
          },
          processedPurchaseTokens: [],
          levelBests: {},
          sectorBests: {},
          daily: { date: '', bestTimeMs: null, bestDeaths: null, continuesUsed: 0 },
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
          version: 6,
          completedLevels: [],
          lastLevelId: null,
          credits: 20,
          inventory: {
            ownedSkins: ['default', 'signal'],
            ownedDeathFx: ['static'],
            ownedSystemPacks: ['standard'],
            ownedTrails: ['data_trail'],
            ownedPremium: ['remove_ads'],
            equippedSkin: 'default',
            equippedDeathFx: 'static',
            equippedSystemPack: 'standard',
            equippedTrail: 'data_trail',
          },
          processedPurchaseTokens: ['tok-1'],
          levelBests: {},
          sectorBests: {},
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
        ownedTrails: ['data_trail'],
        ownedPremium: [],
        equippedSkin: 'default',
        equippedDeathFx: 'static',
        equippedSystemPack: 'standard',
        equippedTrail: 'data_trail',
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

  describe('per-level best time', () => {
    it('has no best for a level that has never been beaten', () => {
      expect(SaveService.getLevelBestMs('sector-01-level-01')).toBeNull();
    });

    it('stores the first clear as the best', () => {
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 5000);
      expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(5000);
    });

    it('replaces the stored best with a strictly faster run', () => {
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 5000);
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 4000);
      expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(4000);
    });

    it('keeps the existing best when a new run is not faster', () => {
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 4000);
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 4000);
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 6000);
      expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(4000);
    });

    it('keeps levels independent', () => {
      SaveService.saveLevelBestIfFaster('sector-01-level-01', 4000);
      SaveService.saveLevelBestIfFaster('sector-02-level-03', 9000);
      expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(4000);
      expect(SaveService.getLevelBestMs('sector-02-level-03')).toBe(9000);
    });

    /**
     * Two migrations meet in this field, and a personal best must survive
     * both (CLAUDE.md #8 — progress is never lost).
     *
     * Keys once carried a `::variantId` suffix, dropped when the adaptive
     * variants were removed; values were once `{ timeMs, samples }` records
     * backing the ghost replay, dropped when the ghost itself was removed
     * at the owner's request. A save written before either change still
     * holds the old shapes.
     */
    describe('saves written before the ghost was removed', () => {
      const cloudSave = (ghosts: Record<string, unknown>): void => {
        vi.mocked(YandexGamesService.isAvailable).mockReturnValue(true);
        vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
          save: JSON.stringify({
            version: 6,
            completedLevels: [],
            lastLevelId: null,
            credits: 0,
            inventory: null,
            processedPurchaseTokens: [],
            ghosts,
          }),
        });
      };

      it('keeps the time out of a v6 ghost record and drops the trace', async () => {
        cloudSave({ 'sector-01-level-01': { timeMs: 7000, samples: [0, 5, 5, 0] } });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(7000);
      });

      it('carries a canonical pre-variant key forward onto the level id', async () => {
        cloudSave({ 'sector-01-level-01::standard': { timeMs: 7000, samples: [0, 5, 5, 0] } });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(7000);
      });

      it('drops a time set on geometry that no longer exists', async () => {
        cloudSave({ 'sector-01-level-01::gentle': { timeMs: 3000, samples: [0, 5, 5, 0] } });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBeNull();
      });

      it('keeps the faster one when a save holds both shapes of the key', async () => {
        cloudSave({
          'sector-01-level-01::standard': { timeMs: 7000, samples: [0, 5, 5, 0] },
          'sector-01-level-01': { timeMs: 4200, samples: [0, 1, 1, 0] },
        });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(4200);
      });

      it('drops a corrupt entry instead of ever returning it', async () => {
        cloudSave({ 'sector-01-level-01': { timeMs: -1, samples: [0, 1] } });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBeNull();
      });
    });

    describe('cloud sync', () => {
      beforeEach(() => {
        vi.mocked(YandexGamesService.isAvailable).mockReturnValue(true);
      });

      const cloudBests = (levelBests: Record<string, number>): void => {
        vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
          save: JSON.stringify({
            version: 7,
            completedLevels: [],
            lastLevelId: null,
            credits: 0,
            inventory: null,
            processedPurchaseTokens: [],
            levelBests,
          }),
        });
      };

      it('adopts a cloud-only best this device has never set', async () => {
        cloudBests({ 'sector-01-level-01': 7000 });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(7000);
      });

      it("keeps this device's faster time over a slower cloud one", async () => {
        SaveService.saveLevelBestIfFaster('sector-01-level-01', 3000);
        cloudBests({ 'sector-01-level-01': 7000 });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(3000);
      });

      it("adopts the cloud time when it beats this device's own", async () => {
        SaveService.saveLevelBestIfFaster('sector-01-level-01', 9000);
        cloudBests({ 'sector-01-level-01': 4000 });
        await SaveService.syncWithCloud();
        expect(SaveService.getLevelBestMs('sector-01-level-01')).toBe(4000);
      });
    });
  });

  /**
   * The Daily Challenge's persistent half (master-prompt §74). The run's own
   * lives live in the scene payload — they have to survive a death restart,
   * not a reload — while today's best and the one rewarded continue live
   * here, because a continue that a page refresh hands back is not a limit.
   */
  describe('daily challenge', () => {
    it('starts a fresh record for a date it has never seen', () => {
      const daily = SaveService.getDaily('2026-09-14');
      expect(daily).toEqual({ date: '2026-09-14', bestTimeMs: null, bestDeaths: null, continuesUsed: 0 });
    });

    it('rolls the record over when the date changes instead of reporting yesterday', () => {
      SaveService.saveDailyResult('2026-09-14', 30_000, 2);
      SaveService.useDailyContinue('2026-09-14');
      const today = SaveService.getDaily('2026-09-15');
      expect(today.bestTimeMs).toBeNull();
      expect(today.continuesUsed).toBe(0);
    });

    it("keeps only the fastest clear of the day, with that run's deaths", () => {
      SaveService.saveDailyResult('2026-09-14', 30_000, 2);
      SaveService.saveDailyResult('2026-09-14', 41_000, 0);
      expect(SaveService.getDaily('2026-09-14')).toMatchObject({ bestTimeMs: 30_000, bestDeaths: 2 });
      SaveService.saveDailyResult('2026-09-14', 21_000, 5);
      expect(SaveService.getDaily('2026-09-14')).toMatchObject({ bestTimeMs: 21_000, bestDeaths: 5 });
    });

    it('allows exactly one rewarded continue per day', () => {
      expect(SaveService.canUseDailyContinue('2026-09-14')).toBe(true);
      expect(SaveService.useDailyContinue('2026-09-14')).toBe(true);
      expect(SaveService.canUseDailyContinue('2026-09-14')).toBe(false);
      expect(SaveService.useDailyContinue('2026-09-14')).toBe(false);
      expect(SaveService.getDaily('2026-09-14').continuesUsed).toBe(1);
    });

    it('hands the continue back when the ad never played, and never below zero', () => {
      SaveService.useDailyContinue('2026-09-14');
      SaveService.refundDailyContinue('2026-09-14');
      expect(SaveService.canUseDailyContinue('2026-09-14')).toBe(true);
      SaveService.refundDailyContinue('2026-09-14');
      expect(SaveService.getDaily('2026-09-14').continuesUsed).toBe(0);
    });

    it('re-reading the same date never resets what it holds', () => {
      // `getDaily` rolls the record over on a date change, and every other
      // daily accessor goes through it — so a bug there would quietly clear
      // the day on the next read rather than at midnight.
      SaveService.saveDailyResult('2026-09-14', 12_345, 1);
      SaveService.useDailyContinue('2026-09-14');
      SaveService.getDaily('2026-09-14');
      expect(SaveService.getDaily('2026-09-14')).toEqual({
        date: '2026-09-14',
        bestTimeMs: 12_345,
        bestDeaths: 1,
        continuesUsed: 1,
      });
    });
  });

  describe('sector bests', () => {
    it('has no best for a sector that has never been cleared', () => {
      expect(SaveService.getSectorBestMs('sector-01')).toBeNull();
    });

    it('stores the first cleared time as the best', () => {
      SaveService.saveSectorBestIfFaster('sector-01', 60000);
      expect(SaveService.getSectorBestMs('sector-01')).toBe(60000);
    });

    it('replaces the stored best with a strictly faster clear', () => {
      SaveService.saveSectorBestIfFaster('sector-01', 60000);
      SaveService.saveSectorBestIfFaster('sector-01', 45000);
      expect(SaveService.getSectorBestMs('sector-01')).toBe(45000);
    });

    it('keeps the existing best when a new clear is not faster', () => {
      SaveService.saveSectorBestIfFaster('sector-01', 45000);
      SaveService.saveSectorBestIfFaster('sector-01', 45000);
      SaveService.saveSectorBestIfFaster('sector-01', 70000);
      expect(SaveService.getSectorBestMs('sector-01')).toBe(45000);
    });

    it('keeps different sectors independent', () => {
      SaveService.saveSectorBestIfFaster('sector-01', 45000);
      SaveService.saveSectorBestIfFaster('sector-02', 90000);
      expect(SaveService.getSectorBestMs('sector-01')).toBe(45000);
      expect(SaveService.getSectorBestMs('sector-02')).toBe(90000);
    });

    it('cloud merge keeps whichever side cleared faster', async () => {
      vi.mocked(YandexGamesService.isAvailable).mockReturnValue(true);
      SaveService.saveSectorBestIfFaster('sector-01', 40000);
      vi.mocked(YandexGamesService.getPlayerData).mockResolvedValue({
        save: JSON.stringify({
          version: 6,
          completedLevels: [],
          lastLevelId: null,
          credits: 0,
          inventory: null,
          processedPurchaseTokens: [],
          levelBests: {},
          sectorBests: { 'sector-01': 30000, 'sector-02': 90000 },
        }),
      });
      await SaveService.syncWithCloud();
      expect(SaveService.getSectorBestMs('sector-01')).toBe(30000);
      expect(SaveService.getSectorBestMs('sector-02')).toBe(90000);
    });
  });
});
