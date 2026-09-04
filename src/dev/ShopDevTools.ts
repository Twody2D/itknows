import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import type { InventoryCategory } from '@/services/InventoryService';
import { SaveService } from '@/services/SaveService';
import { AdsService } from '@/services/AdsService';
import { PurchaseManager } from '@/services/PurchaseManager';
import { YandexGamesService } from '@/services/YandexGamesService';
import type { YsdkPurchase } from '@/services/YandexGamesService';

/**
 * Development-only shop simulation (master-prompt §41) — imported only from
 * `main.ts`'s existing `if (import.meta.env.DEV)` block, same guarantee
 * `window.__game` already relies on: `import.meta.env.DEV` is statically
 * `false` in a production build, so the bundler dead-code-eliminates this
 * entire module (and everything it imports here that production doesn't
 * already need) rather than merely leaving it unused. Never imported from
 * anywhere else — verified via a `dist/` grep alongside the existing
 * `window.__game` check (CLAUDE.md #Phase-0's bundle audit).
 *
 * `simulatePurchaseSuccess`/`Failure`/`simulateRestore` exercise the REAL
 * `PurchaseManager` grant/idempotency logic (not a reimplementation of it)
 * by temporarily swapping `YandexGamesService.purchase`/`getPurchases` for
 * the duration of one call — nothing in `YandexGamesService`/`PurchaseManager`
 * itself carries any dev-only branch.
 */
function devToken(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fakePurchase(productId: string): YsdkPurchase {
  return { productID: productId, purchaseToken: devToken(), developerPayload: '' };
}

async function withPurchaseOverride<T>(purchaseResult: YsdkPurchase | null, run: () => Promise<T>): Promise<T> {
  const original = YandexGamesService.purchase;
  YandexGamesService.purchase = async () => purchaseResult;
  try {
    return await run();
  } finally {
    YandexGamesService.purchase = original;
  }
}

async function withPurchasesOverride<T>(purchases: YsdkPurchase[], run: () => Promise<T>): Promise<T> {
  const original = YandexGamesService.getPurchases;
  YandexGamesService.getPurchases = async () => purchases;
  try {
    return await run();
  } finally {
    YandexGamesService.getPurchases = original;
  }
}

function isEntitlementProduct(productId: string): boolean {
  return productId === 'remove_ads' || productId === 'system_access';
}

export const ShopDevTools = {
  addCredits(amount: number): void {
    CurrencyService.earnCredits(amount, 'dev');
  },

  unlock(category: InventoryCategory, id: string): void {
    InventoryService.unlock(category, id);
  },

  /** Resets credits/inventory/processed-purchase-tokens only — level progress is untouched. */
  resetInventory(): void {
    SaveService.resetShopState();
  },

  /** Simulates a fully successful real-money purchase for `productId`, through the real PurchaseManager flow (whitelist check, idempotent grant, save, consume). */
  async simulatePurchaseSuccess(productId: string): Promise<'success' | 'failed'> {
    return withPurchaseOverride(fakePurchase(productId), () =>
      isEntitlementProduct(productId) ? PurchaseManager.purchaseEntitlement(productId) : PurchaseManager.purchaseConsumable(productId),
    );
  },

  /** Simulates a declined/failed purchase (cancelled, network error, ...) — confirms nothing is granted. */
  async simulatePurchaseFailure(productId: string): Promise<'success' | 'failed'> {
    return withPurchaseOverride(null, () =>
      isEntitlementProduct(productId) ? PurchaseManager.purchaseEntitlement(productId) : PurchaseManager.purchaseConsumable(productId),
    );
  },

  /** Simulates the boot-time restore path finding an unprocessed purchase (e.g. "app closed mid-purchase") for one or more product ids. */
  async simulateRestore(productIds: string[]): Promise<void> {
    await withPurchasesOverride(productIds.map(fakePurchase), () => PurchaseManager.restorePurchases());
  },

  /** Shortcut for the common manual-test case. */
  async simulateNoAds(): Promise<'success' | 'failed'> {
    return this.simulatePurchaseSuccess('remove_ads');
  },

  isAdsDisabled(): boolean {
    return AdsService.isAdsDisabled();
  },
};
