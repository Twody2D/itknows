import { SaveService } from './SaveService';
import type { InventoryData } from './SaveService';

/** The four cosmetic slots — each has exactly one equipped id at a time. Premium products (`remove_ads`/`system_access`) are owned-only, never "equipped". */
export type InventoryCategory = 'character' | 'death_fx' | 'system' | 'trail';

const OWNED_FIELD: Record<InventoryCategory, keyof InventoryData> = {
  character: 'ownedSkins',
  death_fx: 'ownedDeathFx',
  system: 'ownedSystemPacks',
  trail: 'ownedTrails',
};

const EQUIPPED_FIELD: Record<InventoryCategory, keyof InventoryData> = {
  character: 'equippedSkin',
  death_fx: 'equippedDeathFx',
  system: 'equippedSystemPack',
  trail: 'equippedTrail',
};

/**
 * Cosmetic ownership + what's currently equipped, plus premium (non-
 * consumable) product ownership — all through `SaveService`'s `inventory`
 * field, never a second save file (master-prompt §12/§19). No UI mutates
 * this directly; `equip`/`unlock` are the only ways in, and `equip` refuses
 * to select anything not owned (§12 — "не менять inventory из UI напрямую"
 * means going through here, not around it).
 */
class InventoryServiceController {
  isOwned(category: InventoryCategory, id: string): boolean {
    const owned = SaveService.getInventory()[OWNED_FIELD[category]] as string[];
    return owned.includes(id);
  }

  getEquipped(category: InventoryCategory): string {
    return SaveService.getInventory()[EQUIPPED_FIELD[category]] as string;
  }

  /** Idempotent — unlocking an already-owned id is a harmless no-op. */
  unlock(category: InventoryCategory, id: string): void {
    if (this.isOwned(category, id)) return;
    const inventory = { ...SaveService.getInventory() };
    const field = OWNED_FIELD[category];
    inventory[field] = [...(inventory[field] as string[]), id] as never;
    SaveService.setInventory(inventory);
  }

  /** Refuses to equip anything not owned — returns `false` rather than silently no-op-ing, so the UI can show a real error instead of pretending it worked. */
  equip(category: InventoryCategory, id: string): boolean {
    if (!this.isOwned(category, id)) return false;
    if (this.getEquipped(category) === id) return true;
    const inventory = { ...SaveService.getInventory() };
    inventory[EQUIPPED_FIELD[category]] = id as never;
    SaveService.setInventory(inventory);
    return true;
  }

  isPremiumOwned(productId: string): boolean {
    return SaveService.getInventory().ownedPremium.includes(productId);
  }

  /** Idempotent — re-granting an owned premium product is a no-op. */
  grantPremium(productId: string): void {
    if (this.isPremiumOwned(productId)) return;
    const inventory = { ...SaveService.getInventory() };
    inventory.ownedPremium = [...inventory.ownedPremium, productId];
    SaveService.setInventory(inventory);
  }
}

export const InventoryService = new InventoryServiceController();
