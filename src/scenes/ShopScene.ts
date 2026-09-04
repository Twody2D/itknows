import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';
import { fadeIn } from '@/ui/SceneFade';
import { EventBus } from '@/core/EventBus';
import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import type { InventoryCategory } from '@/services/InventoryService';
import { PurchaseManager } from '@/services/PurchaseManager';
import { AdsService } from '@/services/AdsService';
import { SHOP_ITEMS } from '@/data/shop/items';
import type { ShopCategory, ShopItem } from '@/data/shop/items';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { commentOnShop } from '@/data/dialogues/shop';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';
import type { UiStringKey } from '@/i18n/ui';

const CATEGORIES: ShopCategory[] = ['character', 'death_fx', 'system', 'premium'];
const CATEGORY_LABEL: Record<ShopCategory, UiStringKey> = {
  character: 'shopCategoryCharacter',
  death_fx: 'shopCategoryDeathFx',
  system: 'shopCategorySystem',
  premium: 'shopCategoryPremium',
};
/** `ShopItem.category` values that map onto an `InventoryService` equip slot — `premium` products are owned-only, never equipped. */
const INVENTORY_CATEGORY: Partial<Record<ShopCategory, InventoryCategory>> = {
  character: 'character',
  death_fx: 'death_fx',
  system: 'system',
};

const SYSTEM_LINE_MS = 2600;
type Disposable = { destroy(): void };

/**
 * "SYSTEM ARCHIVE" — master-prompt §13. Overlay scene (launched/stopped like
 * Settings/LevelSelect), never the primary scene. Reuses the exact same
 * panel/button/paging kit every other overlay already does — no gold coins,
 * no gradient cards, no new visual language (§14).
 */
export class ShopScene extends Phaser.Scene {
  private categoryIndex = 0;
  private selectedByCategory = new Map<ShopCategory, string>();
  private purchaseInProgress = false;
  private catalogPricesById = new Map<string, string>();
  private catalogLoaded = false;

  private content: Disposable[] = [];
  private balanceLabel!: PixelLabel;
  private systemLineLabel!: PixelLabel;
  private systemLineTimer: number | null = null;
  private view: 'main' | 'credits' = 'main';
  private leftButton!: PixelButton;

  private panelX = 0;
  private panelY = 0;
  private panelW = 0;
  private panelH = 0;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    const { width, height } = this.scale;

    buildDimBackdrop(this);
    fadeIn(this);

    this.panelW = Math.min(340, width - 24);
    this.panelH = Math.min(236, height - 16);
    this.panelX = width / 2 - this.panelW / 2;
    this.panelY = height / 2 - this.panelH / 2;

    const g = this.add.graphics();
    drawPanel(g, this.panelX, this.panelY, this.panelW, this.panelH);

    new PixelLabel(this, width / 2, this.panelY + 14, t('shopTitle'), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    this.balanceLabel = new PixelLabel(this, width / 2, this.panelY + 30, this.balanceText(), {
      color: hexToCss(PALETTE.reward),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    }).setOrigin(0.5, 0.5);

    new PixelButton(this, this.panelX + 26, this.panelY + 48, '<', {
      width: 22,
      height: 20,
      onClick: () => this.changeCategory(-1),
    });
    new PixelButton(this, this.panelX + this.panelW - 26, this.panelY + 48, '>', {
      width: 22,
      height: 20,
      onClick: () => this.changeCategory(1),
    });

    // `leftButton` is contextual (GET CREDITS <-> back-to-categories,
    // toggled by `openGetCredits`/`backToMain`) — the right button always
    // means "close the shop", regardless of which sub-view is showing, so
    // there's never a second competing "back" control on screen at once.
    this.leftButton = new PixelButton(this, this.panelX + 40, this.panelY + this.panelH - 14, t('shopGetCredits'), {
      width: this.panelW / 2 - 48,
      height: 18,
      textScale: 1,
      onClick: () => (this.view === 'main' ? this.openGetCredits() : this.backToMain()),
    });
    new PixelButton(this, this.panelX + this.panelW - 40, this.panelY + this.panelH - 14, t('back'), {
      width: this.panelW / 2 - 48,
      height: 18,
      textScale: 1,
      onClick: () => this.scene.stop(),
    });

    this.systemLineLabel = new PixelLabel(this, width / 2, this.panelY + this.panelH - 34, '', {
      color: hexToCss(PALETTE.system),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
      wordWrapWidth: this.panelW - 24,
    }).setOrigin(0.5, 0.5);

    EventBus.on('system:comment', this.handleSystemComment, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('system:comment', this.handleSystemComment, this);
      if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    });

    commentOnShop('open');
    void this.loadCatalog();
    this.renderCategory();
  }

  private handleSystemComment(payload: { text: string; category: string }): void {
    if (payload.category !== 'shop') return;
    this.systemLineLabel.setPixelText(payload.text);
    if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    this.systemLineTimer = window.setTimeout(() => this.systemLineLabel.setPixelText(''), SYSTEM_LINE_MS);
  }

  private balanceText(): string {
    return `CREDITS ${CurrencyService.getBalance()}`;
  }

  private refreshBalance(): void {
    this.balanceLabel.setPixelText(this.balanceText());
  }

  private async loadCatalog(): Promise<void> {
    const catalog = await PurchaseManager.getCatalog();
    for (const [id, product] of catalog) this.catalogPricesById.set(id, product.price);
    this.catalogLoaded = true;
    this.renderCategory();
  }

  private changeCategory(delta: number): void {
    this.categoryIndex = Phaser.Math.Wrap(this.categoryIndex + delta, 0, CATEGORIES.length);
    this.renderCategory();
  }

  private clearContent(): void {
    for (const item of this.content) item.destroy();
    this.content = [];
  }

  private currentCategory(): ShopCategory {
    return CATEGORIES[this.categoryIndex]!;
  }

  private isOwned(item: ShopItem): boolean {
    if (item.category === 'premium') return InventoryService.isPremiumOwned(item.productId ?? item.id);
    const category = INVENTORY_CATEGORY[item.category];
    return category ? InventoryService.isOwned(category, item.id) : false;
  }

  /** Bundle-exclusive cosmetics (no price, no productId) only ever appear once owned — never shown as a fake purchase option (master-prompt §28). */
  private visibleItems(category: ShopCategory): ShopItem[] {
    return SHOP_ITEMS.filter((item) => {
      if (item.category !== category) return false;
      if (item.priceCredits !== undefined || item.productId !== undefined) return true;
      return this.isOwned(item);
    });
  }

  private selectedItem(category: ShopCategory): ShopItem {
    const items = this.visibleItems(category);
    const selectedId = this.selectedByCategory.get(category);
    return items.find((item) => item.id === selectedId) ?? items[0]!;
  }

  private renderCategory(): void {
    this.clearContent();
    const { width } = this.scale;
    const category = this.currentCategory();
    const items = this.visibleItems(category);
    if (!this.selectedByCategory.has(category)) this.selectedByCategory.set(category, items[0]!.id);
    const selected = this.selectedItem(category);

    const label = new PixelLabel(this, width / 2, this.panelY + 66, t(CATEGORY_LABEL[category]), {
      color: hexToCss(PALETTE.cyan),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    }).setOrigin(0.5, 0.5);
    this.content.push(label);

    const tileW = 66;
    const tileH = 22;
    const gap = 6;
    const perRow = Math.max(1, Math.floor((this.panelW - 24 + gap) / (tileW + gap)));
    const rowWidth = Math.min(items.length, perRow) * (tileW + gap) - gap;
    const startX = width / 2 - rowWidth / 2 + tileW / 2;
    const gridY = this.panelY + 82;

    items.forEach((item, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (tileW + gap);
      const y = gridY + row * (tileH + gap);
      const isSelected = item.id === selected.id;
      const owned = this.isOwned(item);

      const tile = new PixelButton(this, x, y, t(item.nameKey), {
        width: tileW,
        height: tileH,
        textScale: 1,
        variant: isSelected ? 'primary' : 'secondary',
        onClick: () => {
          this.selectedByCategory.set(category, item.id);
          this.renderCategory();
        },
      });
      this.content.push(tile);

      if (owned) {
        const dot = this.add.rectangle(x + tileW / 2 - 5, y - tileH / 2 + 5, 3, 3, PALETTE.cyan, 1);
        this.content.push(dot);
      }
    });

    this.renderPreview(selected, gridY + Math.ceil(items.length / perRow) * (tileH + gap) + 10);
  }

  private renderPreview(item: ShopItem, y: number): void {
    const { width } = this.scale;
    const owned = this.isOwned(item);
    const equipSlot = INVENTORY_CATEGORY[item.category];
    const isEquipped = equipSlot ? InventoryService.getEquipped(equipSlot) === item.id : false;

    if (item.category === 'character') {
      const prefix = playerTexturePrefix(item.id);
      // origin (0.5, 0) grows downward from `y` — the grid above sits right
      // above this preview area, and an upward-growing origin (as the menu's
      // own floor-standing preview uses) would run straight into it here.
      const sprite = this.add.sprite(width / 2 - 90, y, `${prefix}-idle-0`).setOrigin(0.5, 0).setScale(1.2);
      if (this.anims.exists(`${prefix}-idle`)) sprite.play(`${prefix}-idle`);
      this.content.push(sprite);
    }

    const desc = new PixelLabel(this, width / 2 + 20, y, t(item.descriptionKey), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
      wordWrapWidth: this.panelW - 140,
    }).setOrigin(0, 0);
    this.content.push(desc);

    let statusText = '';
    if (owned) {
      statusText = isEquipped || !equipSlot ? t('shopEquipped') : t('shopOwned');
    } else if (item.priceCredits !== undefined) {
      statusText = `${item.priceCredits} CREDITS`;
    } else if (item.productId) {
      statusText = this.catalogPricesById.get(item.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
    }
    const status = new PixelLabel(this, width / 2 + 20, y + desc.height + 6, statusText, {
      color: hexToCss(owned ? PALETTE.cyan : PALETTE.reward),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    }).setOrigin(0, 0);
    this.content.push(status);

    const buttonY = this.panelY + this.panelH - 58;
    const buttonW = this.panelW - 24;

    if (owned && equipSlot && !isEquipped) {
      const equip = new PixelButton(this, width / 2, buttonY, t('shopEquip'), {
        width: buttonW,
        height: 18,
        textScale: 1,
        onClick: () => {
          InventoryService.equip(equipSlot, item.id);
          this.renderCategory();
        },
      });
      this.content.push(equip);
    } else if (!owned) {
      const buy = new PixelButton(this, width / 2, buttonY, t('shopBuy'), {
        width: buttonW,
        height: 18,
        textScale: 1,
        onClick: () => void this.handleBuy(item),
      });
      this.content.push(buy);
    }
  }

  private async handleBuy(item: ShopItem): Promise<void> {
    if (this.purchaseInProgress) return;

    if (item.priceCredits !== undefined) {
      if (!CurrencyService.canAfford(item.priceCredits)) {
        commentOnShop('insufficient_credits');
        this.renderCategory();
        return;
      }
      const equipSlot = INVENTORY_CATEGORY[item.category];
      if (!equipSlot) return;
      const isFirstCosmetic = !this.hasAnyPurchasedCosmetic();
      CurrencyService.spendCredits(item.priceCredits, 'shop_item');
      InventoryService.unlock(equipSlot, item.id);
      this.refreshBalance();
      commentOnShop(isFirstCosmetic ? 'first_cosmetic' : 'purchase_confirmed');
      this.renderCategory();
      return;
    }

    if (!item.productId) return;
    this.purchaseInProgress = true;
    this.renderCategory();

    const result =
      item.category === 'premium'
        ? await PurchaseManager.purchaseEntitlement(item.productId)
        : await PurchaseManager.purchaseConsumable(item.productId);

    this.purchaseInProgress = false;
    this.refreshBalance();
    if (result === 'success') {
      commentOnShop(item.productId === 'remove_ads' || item.productId === 'system_access' ? 'no_ads' : 'purchase_confirmed');
    }
    this.renderCategory();
  }

  private hasAnyPurchasedCosmetic(): boolean {
    const inv = InventoryService;
    return (
      inv.isOwned('character', 'void') ||
      inv.isOwned('character', 'signal') ||
      inv.isOwned('death_fx', 'glitch') ||
      inv.isOwned('system', 'cold')
    );
  }

  /** A lightweight in-scene sub-view rather than a second scene — same idea as `SettingsScene` being one self-contained overlay. */
  private openGetCredits(): void {
    this.view = 'credits';
    this.leftButton.setLabelText(t('shopToArchive'));
    this.clearContent();
    const { width } = this.scale;

    const title = new PixelLabel(this, width / 2, this.panelY + 66, t('shopGetCredits'), {
      color: hexToCss(PALETTE.cyan),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    }).setOrigin(0.5, 0.5);
    this.content.push(title);

    let y = this.panelY + 84;
    for (const pack of CREDIT_PACKS) {
      const price = this.catalogPricesById.get(pack.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
      const row = new PixelButton(this, width / 2, y, `${pack.credits} CREDITS — ${price}`, {
        width: this.panelW - 24,
        height: 18,
        textScale: 1,
        onClick: () => void this.handleBuyCreditPack(pack.productId),
      });
      this.content.push(row);
      y += 22;
    }

    if (!AdsService.isAdsDisabled()) {
      const rewarded = new PixelButton(this, width / 2, y + 4, `${t('shopWatchAd')} — ${EARN_AMOUNTS.rewardedAd} CREDITS`, {
        width: this.panelW - 24,
        height: 18,
        textScale: 1,
        onClick: () => {
          AdsService.requestRewarded((granted) => {
            if (granted) {
              CurrencyService.earnCredits(EARN_AMOUNTS.rewardedAd, 'rewarded_ad');
              this.refreshBalance();
            }
          });
        },
      });
      this.content.push(rewarded);
    }
  }

  /** Returns from the GET CREDITS sub-view to the category grid — the counterpart to `openGetCredits`, both toggling the same contextual `leftButton`. */
  private backToMain(): void {
    this.view = 'main';
    this.leftButton.setLabelText(t('shopGetCredits'));
    this.renderCategory();
  }

  private async handleBuyCreditPack(productId: string): Promise<void> {
    if (this.purchaseInProgress) return;
    this.purchaseInProgress = true;
    const result = await PurchaseManager.purchaseConsumable(productId);
    this.purchaseInProgress = false;
    this.refreshBalance();
    if (result === 'success') commentOnShop('purchase_confirmed');
    this.openGetCredits();
  }
}
