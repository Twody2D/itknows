import type { UiStringKey } from '@/i18n/ui';
import { BEEP7_TRAIL_STARS, COLLECTOR_SKIN_STARS, ECHO_SKIN_STARS } from '@/gameplay/stars';

/** Master-prompt §8 categories. `premium` covers both `remove_ads` and the `system_access` bundle — owned-only, never equipped. */
export type ShopCategory = 'character' | 'death_fx' | 'system' | 'trail' | 'premium';

export type ShopRarity = 'common' | 'rare' | 'premium';

/**
 * `unlockCondition` is typed now for future secret/achievement-gated items
 * (master-prompt §28) — `achievement`/`daily_challenge` still have no
 * achievement/Daily-Challenge infra to back a real condition, so nothing
 * sets those (a fake one would violate §28's own "never use fake purchases"
 * honesty rule). `campaign_complete` is real: the shop showroom redesign
 * (2026-09-06) gates the `core` skin on `SaveService.getCompletedLevels()`
 * already covering every level (`ShopScene`'s own check), no new save field.
 * `stars` is real too (2026-09-19): `SaveService.getTotalStars()`, the rating
 * the level map already shows. It is the one unlock that cannot be reached
 * by paying — which is the whole reason it exists. Stars pay CREDITS
 * (`gameplay/stars.ts`), so a catalogue that was only ever purchasable would
 * end up with more money chasing it than there are things to buy.
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
  unlockCondition?:
    | { kind: 'achievement' | 'daily_challenge'; id: string }
    | { kind: 'campaign_complete' }
    | { kind: 'stars'; count: number };
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
  {
    id: 'patrol',
    category: 'character',
    nameKey: 'shopSkinPatrol',
    descriptionKey: 'shopSkinPatrolDesc',
    priceCredits: 150,
    rarity: 'rare',
  },
  // Earned, never bought — see `ECHO_SKIN_STARS` for the measurement that
  // took its price away. A third of the campaign's stars: reachable well
  // before the end, so the ladder starts inside the game rather than after it.
  {
    id: 'echo',
    category: 'character',
    nameKey: 'shopSkinEcho',
    descriptionKey: 'shopSkinEchoDesc',
    rarity: 'premium',
    unlockCondition: { kind: 'stars', count: ECHO_SKIN_STARS },
  },
  // Locked until every level in the campaign is completed — a real,
  // already-tracked stat (`SaveService.getCompletedLevels()`), never a fake
  // purchase (CLAUDE.md #12). No price/productId: not for sale.
  {
    id: 'core',
    category: 'character',
    nameKey: 'shopSkinCore',
    descriptionKey: 'shopSkinCoreDesc',
    rarity: 'premium',
    unlockCondition: { kind: 'campaign_complete' },
  },
  // Earned, never bought. The threshold is half of every star in the
  // campaign, so it asks for two-starring the way through rather than
  // three-starring anything — the same shape of demand the sector gates
  // make (`gameplay/stars.ts`), and for the same reason: a price nobody
  // reaches is not a goal.
  {
    id: 'reference',
    category: 'character',
    nameKey: 'shopSkinReference',
    descriptionKey: 'shopSkinReferenceDesc',
    rarity: 'premium',
    unlockCondition: { kind: 'stars', count: COLLECTOR_SKIN_STARS },
  },

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

  // TRAILS (`src/gameplay/TrailFx.ts` — design round 2, 2026-09-06)
  { id: 'data_trail', category: 'trail', nameKey: 'shopTrailDataTrail', descriptionKey: 'shopTrailDataTrailDesc', rarity: 'common' },
  {
    id: 'launch',
    category: 'trail',
    nameKey: 'shopTrailLaunch',
    descriptionKey: 'shopTrailLaunchDesc',
    priceCredits: 130,
    rarity: 'rare',
  },
  {
    id: 'interference',
    category: 'trail',
    nameKey: 'shopTrailInterference',
    descriptionKey: 'shopTrailInterferenceDesc',
    priceCredits: 130,
    rarity: 'rare',
  },
  // The top of the earn-only ladder: two thirds of every star in the
  // campaign, which is the one threshold that needs three-starring rather
  // than merely finishing well. It was the single most expensive item in
  // the shop, and is now the one that money cannot reach at all.
  {
    id: 'beep7',
    category: 'trail',
    nameKey: 'shopTrailBeep7',
    descriptionKey: 'shopTrailBeep7Desc',
    rarity: 'premium',
    unlockCondition: { kind: 'stars', count: BEEP7_TRAIL_STARS },
  },

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
