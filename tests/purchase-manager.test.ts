import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseManager } from '@/services/PurchaseManager';
import { YandexGamesService } from '@/services/YandexGamesService';
import { SaveService } from '@/services/SaveService';
import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import { AdsService } from '@/services/AdsService';

vi.mock('@/services/YandexGamesService', () => ({
  YandexGamesService: {
    isAvailable: vi.fn(() => true),
    getPlayerData: vi.fn(async () => null),
    setPlayerData: vi.fn(async () => undefined),
    getCatalog: vi.fn(async () => []),
    purchase: vi.fn(async () => null),
    getPurchases: vi.fn(async () => []),
    consumePurchase: vi.fn(async () => undefined),
  },
}));

function fakePurchase(productID: string, purchaseToken: string) {
  return { productID, purchaseToken, developerPayload: '' };
}

describe('PurchaseManager', () => {
  beforeEach(() => {
    SaveService.resetForTests();
    AdsService.resetSessionForTests();
    vi.mocked(YandexGamesService.purchase).mockReset();
    vi.mocked(YandexGamesService.getPurchases).mockReset().mockResolvedValue([]);
    vi.mocked(YandexGamesService.consumePurchase).mockReset().mockResolvedValue(undefined);
  });

  describe('purchaseConsumable', () => {
    it('rejects a product id outside the credit-pack whitelist', async () => {
      const result = await PurchaseManager.purchaseConsumable('not_a_real_product');
      expect(result).toBe('failed');
      expect(YandexGamesService.purchase).not.toHaveBeenCalled();
    });

    it('grants credits, persists, then consumes only after a confirmed purchase', async () => {
      vi.mocked(YandexGamesService.purchase).mockResolvedValue(fakePurchase('credits_550', 'tok-1'));
      const result = await PurchaseManager.purchaseConsumable('credits_550');
      expect(result).toBe('success');
      expect(CurrencyService.getBalance()).toBe(550);
      expect(SaveService.hasProcessedPurchase('tok-1')).toBe(true);
      expect(YandexGamesService.consumePurchase).toHaveBeenCalledWith('tok-1');
    });

    it('never grants anything when the purchase call itself fails', async () => {
      vi.mocked(YandexGamesService.purchase).mockResolvedValue(null);
      const result = await PurchaseManager.purchaseConsumable('credits_100');
      expect(result).toBe('failed');
      expect(CurrencyService.getBalance()).toBe(0);
    });

    it('never grants the same purchase token twice', async () => {
      vi.mocked(YandexGamesService.purchase).mockResolvedValue(fakePurchase('credits_100', 'tok-dup'));
      await PurchaseManager.purchaseConsumable('credits_100');
      // Simulate the same token being processed again (e.g. a duplicate restore pass).
      await PurchaseManager.restorePurchases();
      expect(CurrencyService.getBalance()).toBe(100);
    });
  });

  describe('purchaseEntitlement', () => {
    it('rejects an unknown product id', async () => {
      const result = await PurchaseManager.purchaseEntitlement('unknown_product');
      expect(result).toBe('failed');
    });

    it('grants remove_ads and disables ads, without consuming the non-consumable', async () => {
      vi.mocked(YandexGamesService.purchase).mockResolvedValue(fakePurchase('remove_ads', 'tok-ads'));
      const result = await PurchaseManager.purchaseEntitlement('remove_ads');
      expect(result).toBe('success');
      expect(InventoryService.isPremiumOwned('remove_ads')).toBe(true);
      expect(AdsService.isAdsDisabled()).toBe(true);
      expect(YandexGamesService.consumePurchase).not.toHaveBeenCalled();
    });

    it('grants the full system_access bundle atomically', async () => {
      vi.mocked(YandexGamesService.purchase).mockResolvedValue(fakePurchase('system_access', 'tok-bundle'));
      await PurchaseManager.purchaseEntitlement('system_access');
      expect(InventoryService.isPremiumOwned('remove_ads')).toBe(true);
      expect(InventoryService.isPremiumOwned('system_access')).toBe(true);
      expect(InventoryService.isOwned('character', 'error404')).toBe(true);
      expect(InventoryService.isOwned('death_fx', 'data_wipe')).toBe(true);
      expect(InventoryService.isOwned('system', 'corrupted')).toBe(true);
      expect(AdsService.isAdsDisabled()).toBe(true);
    });
  });

  describe('restorePurchases', () => {
    it('replays an unprocessed purchase reported by getPurchases (app closed mid-purchase)', async () => {
      vi.mocked(YandexGamesService.getPurchases).mockResolvedValue([fakePurchase('credits_1200', 'tok-restore')]);
      await PurchaseManager.restorePurchases();
      expect(CurrencyService.getBalance()).toBe(1200);
      expect(SaveService.hasProcessedPurchase('tok-restore')).toBe(true);
    });

    it('does not re-grant a purchase already processed', async () => {
      SaveService.markPurchaseProcessed('tok-known');
      vi.mocked(YandexGamesService.getPurchases).mockResolvedValue([fakePurchase('credits_1200', 'tok-known')]);
      await PurchaseManager.restorePurchases();
      expect(CurrencyService.getBalance()).toBe(0);
    });

    it('leaves an unrecognized product id unprocessed rather than granting against a whitelist miss', async () => {
      vi.mocked(YandexGamesService.getPurchases).mockResolvedValue([fakePurchase('mystery_product', 'tok-mystery')]);
      await PurchaseManager.restorePurchases();
      expect(SaveService.hasProcessedPurchase('tok-mystery')).toBe(false);
      expect(CurrencyService.getBalance()).toBe(0);
    });
  });

  describe('init', () => {
    it('re-applies an already-owned entitlement to AdsService on boot', () => {
      InventoryService.grantPremium('remove_ads');
      AdsService.resetSessionForTests();
      expect(AdsService.isAdsDisabled()).toBe(false);
      PurchaseManager.init();
      expect(AdsService.isAdsDisabled()).toBe(true);
    });
  });
});
