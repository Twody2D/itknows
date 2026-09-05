import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS, SYSTEM_ACCESS_BUNDLE } from '@/data/shop/items';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { UI_STRING_KEYS_FOR_TEST } from '@/i18n/ui';

const VALID_CATEGORIES = new Set(['character', 'death_fx', 'system', 'trail', 'premium']);

describe('SHOP_ITEMS sanity', () => {
  it('has unique ids', () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every item has a valid category', () => {
    for (const item of SHOP_ITEMS) expect(VALID_CATEGORIES.has(item.category)).toBe(true);
  });

  it('every item has either a positive integer credits price, a real productId, or neither (bundle-exclusive) — never both', () => {
    for (const item of SHOP_ITEMS) {
      if (item.priceCredits !== undefined) {
        expect(Number.isInteger(item.priceCredits)).toBe(true);
        expect(item.priceCredits).toBeGreaterThan(0);
        expect(item.productId).toBeUndefined();
      }
      if (item.productId !== undefined) {
        expect(typeof item.productId).toBe('string');
        expect(item.productId.length).toBeGreaterThan(0);
      }
    }
  });

  it('nameKey/descriptionKey reference real i18n keys', () => {
    for (const item of SHOP_ITEMS) {
      expect(UI_STRING_KEYS_FOR_TEST).toContain(item.nameKey);
      expect(UI_STRING_KEYS_FOR_TEST).toContain(item.descriptionKey);
    }
  });

  it('premium items carry a productId (real Yandex product), never a credits price', () => {
    for (const item of SHOP_ITEMS.filter((i) => i.category === 'premium')) {
      expect(item.productId).toBeDefined();
      expect(item.priceCredits).toBeUndefined();
    }
  });

  it('the SYSTEM ACCESS bundle exclusives exist as items but are not independently purchasable', () => {
    const skin = SHOP_ITEMS.find((i) => i.id === SYSTEM_ACCESS_BUNDLE.skin);
    const deathFx = SHOP_ITEMS.find((i) => i.id === SYSTEM_ACCESS_BUNDLE.deathFx);
    const systemPack = SHOP_ITEMS.find((i) => i.id === SYSTEM_ACCESS_BUNDLE.systemPack);
    for (const item of [skin, deathFx, systemPack]) {
      expect(item).toBeDefined();
      expect(item!.priceCredits).toBeUndefined();
      expect(item!.productId).toBeUndefined();
    }
  });
});

describe('CREDIT_PACKS sanity', () => {
  it('has unique product ids', () => {
    const ids = CREDIT_PACKS.map((pack) => pack.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every pack grants a positive integer amount of credits', () => {
    for (const pack of CREDIT_PACKS) {
      expect(Number.isInteger(pack.credits)).toBe(true);
      expect(pack.credits).toBeGreaterThan(0);
    }
  });

  it('never overlaps a SHOP_ITEMS product id', () => {
    const shopProductIds = new Set(SHOP_ITEMS.map((item) => item.productId).filter(Boolean));
    for (const pack of CREDIT_PACKS) expect(shopProductIds.has(pack.productId)).toBe(false);
  });
});
