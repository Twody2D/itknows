import { beforeEach, describe, expect, it } from 'vitest';
import { InventoryService } from '@/services/InventoryService';
import { SaveService } from '@/services/SaveService';

describe('InventoryService', () => {
  beforeEach(() => {
    SaveService.resetForTests();
  });

  it('owns and equips the free defaults on a fresh save', () => {
    expect(InventoryService.isOwned('character', 'default')).toBe(true);
    expect(InventoryService.isOwned('death_fx', 'static')).toBe(true);
    expect(InventoryService.isOwned('system', 'standard')).toBe(true);
    expect(InventoryService.getEquipped('character')).toBe('default');
    expect(InventoryService.getEquipped('death_fx')).toBe('static');
    expect(InventoryService.getEquipped('system')).toBe('standard');
  });

  it('does not own a purchasable cosmetic before it is unlocked', () => {
    expect(InventoryService.isOwned('character', 'void')).toBe(false);
  });

  it('refuses to equip anything not owned', () => {
    expect(InventoryService.equip('character', 'void')).toBe(false);
    expect(InventoryService.getEquipped('character')).toBe('default');
  });

  it('unlock then equip works, and unlock is idempotent', () => {
    InventoryService.unlock('character', 'void');
    InventoryService.unlock('character', 'void');
    expect(InventoryService.isOwned('character', 'void')).toBe(true);
    expect(InventoryService.equip('character', 'void')).toBe(true);
    expect(InventoryService.getEquipped('character')).toBe('void');
  });

  it('tracks premium ownership separately, and grantPremium is idempotent', () => {
    expect(InventoryService.isPremiumOwned('remove_ads')).toBe(false);
    InventoryService.grantPremium('remove_ads');
    InventoryService.grantPremium('remove_ads');
    expect(InventoryService.isPremiumOwned('remove_ads')).toBe(true);
    expect(SaveService.getInventory().ownedPremium).toEqual(['remove_ads']);
  });
});
