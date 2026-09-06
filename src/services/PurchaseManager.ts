import { YandexGamesService } from './YandexGamesService';
import type { YsdkProduct, YsdkPurchase } from './YandexGamesService';
import { SaveService } from './SaveService';
import { CurrencyService } from './CurrencyService';
import { InventoryService } from './InventoryService';
import { AdsService } from './AdsService';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { SYSTEM_ACCESS_BUNDLE } from '@/data/shop/items';

const CREDIT_PACK_BY_ID = new Map(CREDIT_PACKS.map((pack) => [pack.productId, pack]));
const ENTITLEMENT_PRODUCT_IDS = new Set(['remove_ads', 'system_access']);
/** One-time credits gift the shop's "БЕЗ РЕКЛАМЫ" offer advertises — granted once, alongside the entitlement itself. */
const REMOVE_ADS_BONUS_CREDITS = 500;

export type PurchaseResult = 'success' | 'failed';

/**
 * Orchestrates CurrencyService/InventoryService/AdsService around real
 * Yandex purchases — the whole point is master-prompt §6/§40: never trust an
 * arbitrary product id (whitelist check on every entry point below), never
 * grant before a purchase is actually confirmed, never grant the same
 * purchase token twice (`SaveService.hasProcessedPurchase`), and never lose
 * one either (`restorePurchases` replays anything `getPurchases()` still
 * shows that this save hasn't processed yet).
 */
class PurchaseManagerController {
  /** Call once at boot, synchronously — reflects whatever entitlement this save already has (from a previous session/device) into AdsService before anything might ask for an ad. */
  init(): void {
    this.syncAdsEntitlement();
  }

  /** `null` products (SDK unavailable — always true outside a real Yandex iframe, per YandexGamesService) mean the shop shows credits-only items only; callers check `isCatalogAvailable()`. */
  isCatalogAvailable(): boolean {
    return YandexGamesService.isAvailable();
  }

  async getCatalog(): Promise<Map<string, YsdkProduct>> {
    const products = await YandexGamesService.getCatalog();
    return new Map(products.map((product) => [product.id, product]));
  }

  async purchaseConsumable(productId: string): Promise<PurchaseResult> {
    const pack = CREDIT_PACK_BY_ID.get(productId);
    if (!pack) return 'failed';

    const purchase = await YandexGamesService.purchase(productId);
    if (!purchase) return 'failed';

    await this.grantConsumable(purchase, pack.credits);
    return 'success';
  }

  async purchaseEntitlement(productId: string): Promise<PurchaseResult> {
    if (!ENTITLEMENT_PRODUCT_IDS.has(productId)) return 'failed';

    const purchase = await YandexGamesService.purchase(productId);
    if (!purchase) return 'failed';

    this.grantEntitlement(purchase);
    return 'success';
  }

  /**
   * Called once at boot after `YandexGamesService.init()` resolves — detects
   * any purchase the SDK still reports that this save hasn't granted yet
   * (app closed mid-purchase, a fresh device, §44 scenarios E/F) and replays
   * it through the exact same grant path a live purchase uses.
   */
  async restorePurchases(): Promise<void> {
    const purchases = await YandexGamesService.getPurchases();
    for (const purchase of purchases) {
      if (SaveService.hasProcessedPurchase(purchase.purchaseToken)) continue;

      const pack = CREDIT_PACK_BY_ID.get(purchase.productID);
      if (pack) {
        await this.grantConsumable(purchase, pack.credits);
      } else if (ENTITLEMENT_PRODUCT_IDS.has(purchase.productID)) {
        this.grantEntitlement(purchase);
      }
      // An unrecognized productID is left unprocessed on purpose — never
      // grant against a whitelist miss, and never mark it processed either,
      // so a future catalog update can still pick it up.
    }
  }

  /** Real API requires player data to already reflect the grant before consuming (verified in docs/yandex-games.md) — persist first, consume after. */
  private async grantConsumable(purchase: YsdkPurchase, credits: number): Promise<void> {
    if (!SaveService.hasProcessedPurchase(purchase.purchaseToken)) {
      CurrencyService.earnCredits(credits, 'purchase');
      SaveService.markPurchaseProcessed(purchase.purchaseToken);
    }
    await YandexGamesService.consumePurchase(purchase.purchaseToken);
  }

  /** Non-consumables are never `consumePurchase`d — they stay owned, restorable from `getPurchases()` for as long as Yandex remembers them. */
  private grantEntitlement(purchase: YsdkPurchase): void {
    if (SaveService.hasProcessedPurchase(purchase.purchaseToken)) return;

    if (purchase.productID === 'remove_ads') {
      InventoryService.grantPremium('remove_ads');
      // The shop showroom's "БЕЗ РЕКЛАМЫ" offer advertises this bonus — real,
      // one-time, gated by the same purchase-token guard as the entitlement
      // itself (`hasProcessedPurchase` above), never re-granted on restore.
      CurrencyService.earnCredits(REMOVE_ADS_BONUS_CREDITS, 'purchase');
    } else if (purchase.productID === 'system_access') {
      InventoryService.grantPremium(SYSTEM_ACCESS_BUNDLE.premiumProductId);
      InventoryService.grantPremium('system_access');
      InventoryService.unlock('character', SYSTEM_ACCESS_BUNDLE.skin);
      InventoryService.unlock('death_fx', SYSTEM_ACCESS_BUNDLE.deathFx);
      InventoryService.unlock('system', SYSTEM_ACCESS_BUNDLE.systemPack);
    }

    SaveService.markPurchaseProcessed(purchase.purchaseToken);
    this.syncAdsEntitlement();
  }

  private syncAdsEntitlement(): void {
    const owned = InventoryService.isPremiumOwned('remove_ads') || InventoryService.isPremiumOwned('system_access');
    if (owned) AdsService.setAdsDisabled(true);
  }
}

export const PurchaseManager = new PurchaseManagerController();
