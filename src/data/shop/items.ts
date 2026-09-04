import type { UiStringKey } from '@/i18n/ui';

/** Master-prompt §8 categories. `premium` covers both `remove_ads` and the `system_access` bundle — owned-only, never equipped. */
export type ShopCategory = 'character' | 'death_fx' | 'system' | 'premium';

export type ShopRarity = 'common' | 'rare' | 'premium';

/**
 * `unlockCondition` is typed now for future secret/achievement-gated items
 * (master-prompt §28) but nothing in this vertical slice sets it — no
 * achievement/Daily-Challenge infra exists yet to back a real condition, and
 * a fake one would violate §28's own "never use fake purchases" honesty
 * rule. Every item below is either free-by-default, credits-purchasable, or
 * a real Yandex product.
 */
export interface ShopItem {
  id: string;
  category: ShopCategory;
  nameKey: UiStringKey;
  descriptionKey: UiStringKey;
  /** Credits price — omitted for a real Yandex product (see `productId`). */
  priceCredits?: number;
  /** Yandex product id — omitted for a credits-only cosmetic. */
  productId?: string;
  rarity?: ShopRarity;
  unlockCondition?: { kind: 'achievement' | 'daily_challenge'; id: string };
}

/**
 * Vertical slice catalog (master-prompt §46: "3-4 полностью работающих
 * предмета" per category, not the full §8 wishlist). `default`/`static`/
 * `standard` are free and owned+equipped from a fresh save
 * (`InventoryData` defaults, `SaveService.ts`) — listed here too so the shop
 * grid can render them as OWNED/EQUIPPED tiles, not just implicitly assumed.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // CHARACTER
  { id: 'default', category: 'character', nameKey: 'shopSkinDefault', descriptionKey: 'shopSkinDefaultDesc', rarity: 'common' },
  {
    id: 'void',
    category: 'character',
    nameKey: 'shopSkinVoid',
    descriptionKey: 'shopSkinVoidDesc',
    priceCredits: 150,
    rarity: 'rare',
  },
  {
    id: 'signal',
    category: 'character',
    nameKey: 'shopSkinSignal',
    descriptionKey: 'shopSkinSignalDesc',
    priceCredits: 150,
    rarity: 'rare',
  },
  // Exclusive to the SYSTEM ACCESS bundle below — never independently purchasable.
  { id: 'error404', category: 'character', nameKey: 'shopSkinError404', descriptionKey: 'shopSkinError404Desc', rarity: 'premium' },

  // DEATH FX
  { id: 'static', category: 'death_fx', nameKey: 'shopFxStatic', descriptionKey: 'shopFxStaticDesc', rarity: 'common' },
  {
    id: 'glitch',
    category: 'death_fx',
    nameKey: 'shopFxGlitch',
    descriptionKey: 'shopFxGlitchDesc',
    priceCredits: 120,
    rarity: 'rare',
  },
  { id: 'data_wipe', category: 'death_fx', nameKey: 'shopFxDataWipe', descriptionKey: 'shopFxDataWipeDesc', rarity: 'premium' },

  // SYSTEM commentary packs
  { id: 'standard', category: 'system', nameKey: 'shopPackStandard', descriptionKey: 'shopPackStandardDesc', rarity: 'common' },
  {
    id: 'cold',
    category: 'system',
    nameKey: 'shopPackCold',
    descriptionKey: 'shopPackColdDesc',
    priceCredits: 150,
    rarity: 'rare',
  },
  { id: 'corrupted', category: 'system', nameKey: 'shopPackCorrupted', descriptionKey: 'shopPackCorruptedDesc', rarity: 'premium' },

  // PREMIUM
  {
    id: 'remove_ads',
    category: 'premium',
    nameKey: 'shopNoAds',
    descriptionKey: 'shopNoAdsDesc',
    productId: 'remove_ads',
    rarity: 'premium',
  },
  {
    id: 'system_access',
    category: 'premium',
    nameKey: 'shopSystemAccess',
    descriptionKey: 'shopSystemAccessDesc',
    productId: 'system_access',
    rarity: 'premium',
  },
];

/** The `system_access` bundle's atomic grant (master-prompt §11 — one product, never four separate purchases). `PurchaseManager` is the only caller. */
export const SYSTEM_ACCESS_BUNDLE = {
  premiumProductId: 'remove_ads',
  skin: 'error404',
  deathFx: 'data_wipe',
  systemPack: 'corrupted',
} as const;
