/**
 * Consumable Yandex products (master-prompt §4). No prices here on purpose —
 * "не хардкодить реальные цены": display price always comes from
 * `PurchaseManager.getCatalog()` merging these ids against
 * `YandexGamesService.getCatalog()`'s real catalog entries.
 */
export interface CreditPack {
  productId: string;
  credits: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { productId: 'credits_100', credits: 100 },
  { productId: 'credits_550', credits: 550 },
  { productId: 'credits_1200', credits: 1200 },
  { productId: 'credits_2500', credits: 2500 },
  { productId: 'credits_6000', credits: 6000 },
];
