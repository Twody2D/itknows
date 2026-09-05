import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelButton } from '@/ui/PixelButton';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import type { DomTextHandle } from '@/ui/DomTextOverlay';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';
import { fadeIn } from '@/ui/SceneFade';
import { measureLines } from '@/art/font/BitmapFont';
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

// `premium` first (§ user request: No Ads is the very first thing a player
// sees opening the shop, not buried behind three other pages).
const CATEGORIES: ShopCategory[] = ['premium', 'character', 'death_fx', 'system', 'trail'];
const CATEGORY_LABEL: Record<ShopCategory, UiStringKey> = {
  character: 'shopCategoryCharacter',
  death_fx: 'shopCategoryDeathFx',
  system: 'shopCategorySystem',
  trail: 'shopCategoryTrail',
  premium: 'shopCategoryPremium',
};
/** `ShopItem.category` values that map onto an `InventoryService` equip slot — `premium` products are owned-only, never equipped. */
const INVENTORY_CATEGORY: Partial<Record<ShopCategory, InventoryCategory>> = {
  character: 'character',
  death_fx: 'death_fx',
  system: 'system',
  trail: 'trail',
};

const SYSTEM_LINE_MS = 2600;
type Disposable = { destroy(): void };

interface TabHandle {
  category: ShopCategory;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  label: DomTextHandle;
  zone: Phaser.GameObjects.Zone;
  cx: number;
  top: number;
  w: number;
  h: number;
}

/**
 * "SYSTEM ARCHIVE" — master-prompt §13. Overlay scene (launched/stopped like
 * Settings/LevelSelect), never the primary scene. Reuses the exact same
 * panel/button/paging kit every other overlay already does — no gold coins,
 * no gradient cards, no new visual language (§14).
 *
 * Navigation is four always-visible, icon-labelled category tabs rather than
 * a `<`/`>` pager — a child shouldn't have to remember which arrow press
 * lands on which category when every option can just sit on screen at once.
 *
 * All text here renders through `DomTextOverlay` (real browser text, project
 * owner's call) instead of the game's bitmap font — see that module's doc
 * comment for why a canvas texture can't give a proportional OS font a clean
 * result at this game's virtual resolution. Button *chrome* (panel shape,
 * hover/press, hit zone) still comes from the shared `PixelButton`, just with
 * `hideLabel: true` and an `onLabelState` callback keeping a DOM label in
 * sync with its color/press-offset.
 */
export class ShopScene extends Phaser.Scene {
  private categoryIndex = 0;
  private selectedByCategory = new Map<ShopCategory, string>();
  private purchaseInProgress = false;
  private catalogPricesById = new Map<string, string>();
  private catalogLoaded = false;

  private content: Disposable[] = [];
  private tabs: TabHandle[] = [];
  private domText!: DomTextOverlay;
  private balanceLabel!: DomTextHandle;
  private systemLineLabel!: DomTextHandle;
  private systemLineTimer: number | null = null;
  private view: 'main' | 'credits' = 'main';
  private leftButtonText!: DomTextHandle;

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

    this.domText = new DomTextOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    this.panelW = Math.min(340, width - 24);
    this.panelH = Math.min(236, height - 16);
    this.panelX = width / 2 - this.panelW / 2;
    this.panelY = height / 2 - this.panelH / 2;

    const g = this.add.graphics();
    drawPanel(g, this.panelX, this.panelY, this.panelW, this.panelH);

    this.domText.add(
      width / 2,
      this.panelY + 14,
      t('shopTitle'),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), scale: 2, bold: true },
      0.5,
      0.5,
    );

    this.balanceLabel = this.domText.add(
      width / 2,
      this.panelY + 28,
      this.balanceText(),
      { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0.5,
      0.5,
    );

    this.buildTabs();

    // `leftButton` is contextual (GET CREDITS <-> back-to-categories,
    // toggled by `openGetCredits`/`backToMain`) — the right button always
    // means "close the shop", regardless of which sub-view is showing, so
    // there's never a second competing "back" control on screen at once.
    // Widths/centers below are derived from one shared content width so
    // neither button can ever poke out past the panel's own border.
    const bottomGap = 8;
    const bottomBtnW = (this.panelW - 24 - bottomGap) / 2;
    const bottomY = this.panelY + this.panelH - 14;
    const leftX = this.panelX + 12 + bottomBtnW / 2;
    const rightX = this.panelX + this.panelW - 12 - bottomBtnW / 2;

    const left = this.makeButton(leftX, bottomY, t('shopGetCredits'), {
      width: bottomBtnW,
      height: 18,
      onClick: () => (this.view === 'main' ? this.openGetCredits() : this.backToMain()),
    });
    this.leftButtonText = left.domText;

    this.makeButton(rightX, bottomY, t('back'), {
      width: bottomBtnW,
      height: 18,
      onClick: () => this.scene.stop(),
    });

    this.systemLineLabel = this.domText.add(
      width / 2,
      this.panelY + this.panelH - 34,
      '',
      { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: this.panelW - 24 },
      0.5,
      0.5,
    );

    EventBus.on('system:comment', this.handleSystemComment, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('system:comment', this.handleSystemComment, this);
      if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    });

    commentOnShop('open');
    void this.loadCatalog();
    this.renderCategory();
  }

  /**
   * Wires a `PixelButton`'s panel/hover/press/hit-zone chrome to a DOM text
   * label positioned at the same point — the one seam between the game's
   * canvas UI and the shop's real-text overlay. `x`/`y` are the button's
   * fixed center; every ShopScene button is static once placed, so tracking
   * only the press-offset here (no drag/scroll case to handle) is enough.
   */
  private makeButton(
    x: number,
    y: number,
    text: string,
    opts: { width: number; height: number; variant?: 'primary' | 'secondary'; onClick: () => void },
  ): { button: PixelButton; domText: DomTextHandle } {
    const domText = this.domText.add(
      x,
      y,
      text,
      { color: hexToCss(PALETTE.cyan), scale: 1, strokeColor: hexToCss(PALETTE.outline) },
      0.5,
      0.5,
    );

    const button = new PixelButton(this, x, y, text, {
      width: opts.width,
      height: opts.height,
      textScale: 1,
      ...(opts.variant !== undefined ? { variant: opts.variant } : {}),
      onClick: opts.onClick,
      hideLabel: true,
      onLabelState: ({ color, offsetY }) => {
        domText.setColor(hexToCss(color));
        domText.setPosition(x, y + offsetY);
      },
    });

    return { button, domText };
  }

  private handleSystemComment(payload: { text: string; category: string }): void {
    if (payload.category !== 'shop') return;
    // GET CREDITS is a tight list of 5-6 rows already grazing the bottom
    // button bar — there's no room left for a SYSTEM line there without it
    // overlapping the last row (see `openGetCredits`/`backToMain`).
    if (this.view !== 'main') return;
    this.systemLineLabel.setText(payload.text);
    if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    this.systemLineTimer = window.setTimeout(() => this.systemLineLabel.setText(''), SYSTEM_LINE_MS);
  }

  private balanceText(): string {
    return `CREDITS ${CurrencyService.getBalance()}`;
  }

  private refreshBalance(): void {
    this.balanceLabel.setText(this.balanceText());
  }

  private async loadCatalog(): Promise<void> {
    const catalog = await PurchaseManager.getCatalog();
    for (const [id, product] of catalog) this.catalogPricesById.set(id, product.price);
    this.catalogLoaded = true;
    this.renderCategory();
  }

  // ---- category tabs -------------------------------------------------

  /** Small procedural glyphs (PALETTE-only, no new assets) so a category is recognizable by shape/color alone, not just a word — CLAUDE.md #3. */
  private drawCategoryIcon(g: Phaser.GameObjects.Graphics, category: ShopCategory, cx: number, cy: number): void {
    switch (category) {
      case 'premium':
        // A "no" sign — the single most universally-read icon for "this
        // blocks something", which is exactly what NO ADS/SYSTEM ACCESS do.
        g.lineStyle(1.5, PALETTE.danger, 1);
        g.strokeCircle(cx, cy, 5);
        g.lineBetween(cx - 3.2, cy - 3.2, cx + 3.2, cy + 3.2);
        break;
      case 'character':
        // Same body/visor colors as the android itself (drawPlayer.ts
        // defaults) — a tiny recognizable head, not an abstract glyph.
        g.fillStyle(PALETTE.white, 1);
        g.fillRect(cx - 3, cy - 5, 6, 5);
        g.fillStyle(PALETTE.cyan, 1);
        g.fillRect(cx - 2, cy - 4, 4, 2);
        g.fillStyle(PALETTE.white, 0.85);
        g.fillRect(cx - 4, cy, 8, 4);
        break;
      case 'death_fx':
        g.fillStyle(PALETTE.dangerAlt, 1);
        g.fillRect(cx - 1, cy - 5, 2, 10);
        g.fillRect(cx - 5, cy - 1, 10, 2);
        g.fillRect(cx - 3, cy - 3, 2, 2);
        g.fillRect(cx + 1, cy - 3, 2, 2);
        g.fillRect(cx - 3, cy + 1, 2, 2);
        g.fillRect(cx + 1, cy + 1, 2, 2);
        break;
      case 'system':
        g.lineStyle(1.4, PALETTE.system, 1);
        g.strokeRect(cx - 4, cy - 4, 8, 8);
        g.fillStyle(PALETTE.system, 1);
        g.fillRect(cx - 6, cy - 3, 2, 1);
        g.fillRect(cx - 6, cy + 2, 2, 1);
        g.fillRect(cx + 4, cy - 3, 2, 1);
        g.fillRect(cx + 4, cy + 2, 2, 1);
        g.fillRect(cx - 3, cy - 6, 1, 2);
        g.fillRect(cx + 2, cy - 6, 1, 2);
        g.fillRect(cx - 3, cy + 4, 1, 2);
        g.fillRect(cx + 2, cy + 4, 1, 2);
        break;
      case 'trail':
        // Three shrinking, fading squares trailing off diagonally — the
        // universal "motion trail" shorthand, same cyan as `data_trail`.
        g.fillStyle(PALETTE.cyan, 1);
        g.fillRect(cx + 2, cy - 2, 4, 4);
        g.fillStyle(PALETTE.cyan, 0.55);
        g.fillRect(cx - 3, cy + 1, 3, 3);
        g.fillStyle(PALETTE.cyan, 0.25);
        g.fillRect(cx - 6, cy + 3, 2, 2);
        break;
    }
  }

  private buildTabs(): void {
    const gap = 4;
    const contentW = this.panelW - 24;
    const tabW = (contentW - gap * (CATEGORIES.length - 1)) / CATEGORIES.length;
    const tabTop = this.panelY + 36;
    const tabH = 32;

    CATEGORIES.forEach((category, i) => {
      const cx = this.panelX + 12 + tabW / 2 + i * (tabW + gap);

      const bg = this.add.graphics();
      const icon = this.add.graphics();
      const label = this.domText.add(
        cx,
        tabTop + 22,
        t(CATEGORY_LABEL[category]),
        { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: tabW - 6 },
        0.5,
        0.5,
      );

      const zone = this.add
        .zone(cx, tabTop + tabH / 2, tabW, tabH)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.selectCategory(i));

      this.tabs.push({ category, bg, icon, label, zone, cx, top: tabTop, w: tabW, h: tabH });
    });

    this.refreshTabs();
  }

  private refreshTabs(): void {
    const active = this.currentCategory();
    for (const tab of this.tabs) {
      const isActive = tab.category === active;

      tab.bg.clear();
      tab.bg.fillStyle(PALETTE.metalMid, isActive ? 0.55 : 0.22);
      tab.bg.fillRect(tab.cx - tab.w / 2, tab.top, tab.w, tab.h);
      tab.bg.lineStyle(1, isActive ? PALETTE.cyan : PALETTE.cyanDim, isActive ? 1 : 0.6);
      tab.bg.strokeRect(tab.cx - tab.w / 2, tab.top, tab.w, tab.h);

      tab.icon.clear();
      this.drawCategoryIcon(tab.icon, tab.category, tab.cx, tab.top + 9);

      tab.label.setColor(hexToCss(isActive ? PALETTE.white : PALETTE.cyan));
    }
  }

  private setTabsVisible(visible: boolean): void {
    for (const tab of this.tabs) {
      tab.bg.setVisible(visible);
      tab.icon.setVisible(visible);
      tab.label.setVisible(visible);
      if (visible) tab.zone.setInteractive({ useHandCursor: true });
      else tab.zone.disableInteractive();
    }
  }

  private selectCategory(index: number): void {
    if (this.categoryIndex === index) return;
    this.categoryIndex = index;
    this.renderCategory();
  }

  // ---- category grid + preview ---------------------------------------

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

  /** A tile sizes to its own label instead of a shared fixed width — a fixed 66px box is exactly what let "SYSTEM ACCESS" bleed into its neighbour. Still uses the bitmap font's metrics as an estimate (the DOM label sitting on top self-sizes independently), padded generously since the real DOM text now renders wider/narrower per glyph than the bitmap table predicts. */
  private tileWidth(item: ShopItem): number {
    const { width } = measureLines([t(item.nameKey).toUpperCase()]);
    return Math.max(64, width + 34);
  }

  private renderCategory(): void {
    this.clearContent();
    const { width } = this.scale;
    const category = this.currentCategory();
    const items = this.visibleItems(category);
    if (!this.selectedByCategory.has(category)) this.selectedByCategory.set(category, items[0]!.id);
    const selected = this.selectedItem(category);

    const tileH = 22;
    const gap = 6;
    const maxRowWidth = this.panelW - 24;
    const gridTop = this.panelY + 78;

    // Greedy left-to-right row packing using each item's own measured width
    // — variable-width tiles instead of a uniform grid, so the row is only
    // ever as wide as the labels actually are.
    const rows: { item: ShopItem; w: number }[][] = [];
    let row: { item: ShopItem; w: number }[] = [];
    let rowW = 0;
    for (const item of items) {
      const w = this.tileWidth(item);
      const candidateW = rowW === 0 ? w : rowW + gap + w;
      if (rowW > 0 && candidateW > maxRowWidth) {
        rows.push(row);
        row = [];
        rowW = 0;
      }
      row.push({ item, w });
      rowW = rowW === 0 ? w : rowW + gap + w;
    }
    if (row.length > 0) rows.push(row);

    rows.forEach((rowItems, rowIndex) => {
      const rowTotalW = rowItems.reduce((sum, entry, i) => sum + entry.w + (i > 0 ? gap : 0), 0);
      let x = width / 2 - rowTotalW / 2;
      const y = gridTop + rowIndex * (tileH + gap) + tileH / 2;

      for (const { item, w } of rowItems) {
        const cx = x + w / 2;
        const isSelected = item.id === selected.id;
        const owned = this.isOwned(item);

        const { button, domText } = this.makeButton(cx, y, t(item.nameKey), {
          width: w,
          height: tileH,
          variant: isSelected ? 'primary' : 'secondary',
          onClick: () => {
            this.selectedByCategory.set(category, item.id);
            this.renderCategory();
          },
        });
        this.content.push(button, domText);

        if (owned) this.addOwnedBadge(cx + w / 2 - 6, y - tileH / 2 + 6);

        x += w + gap;
      }
    });

    this.renderPreview(selected, gridTop + rows.length * (tileH + gap) + 8);
    this.refreshTabs();
  }

  /** A small filled checkmark badge — deliberately bigger and more legible than a bare dot, so "you already have this" reads at a glance without needing to read the status line. */
  private addOwnedBadge(x: number, y: number): void {
    const badge = this.add.circle(x, y, 5, PALETTE.cyan, 1);
    this.content.push(badge);

    const check = this.add.graphics();
    check.lineStyle(1.4, PALETTE.bgVoid, 1);
    check.beginPath();
    check.moveTo(x - 2.2, y);
    check.lineTo(x - 0.5, y + 2);
    check.lineTo(x + 2.5, y - 2.5);
    check.strokePath();
    this.content.push(check);
  }

  private renderPreview(item: ShopItem, y: number): void {
    const { width } = this.scale;
    const owned = this.isOwned(item);
    const equipSlot = INVENTORY_CATEGORY[item.category];
    const isEquipped = equipSlot ? InventoryService.getEquipped(equipSlot) === item.id : false;
    const hasSprite = item.category === 'character';

    // Only the character category actually has a preview sprite eating the
    // left side of the panel — every other category gets the full content
    // width instead of leaving a gutter for an image that isn't there
    // (which also used to push the wrap width past the panel's own edge).
    let textX = this.panelX + 16;
    let textWrap = this.panelW - 32;

    if (hasSprite) {
      const prefix = playerTexturePrefix(item.id);
      // origin (0.5, 0) grows downward from `y` — the grid above sits right
      // above this preview area, and an upward-growing origin (as the menu's
      // own floor-standing preview uses) would run straight into it here.
      const sprite = this.add.sprite(width / 2 - 90, y, `${prefix}-idle-0`).setOrigin(0.5, 0).setScale(1.2);
      if (this.anims.exists(`${prefix}-idle`)) sprite.play(`${prefix}-idle`);
      this.content.push(sprite);
      textX = width / 2 + 20;
      textWrap = this.panelW - 140;
    }

    const desc = this.domText.add(
      textX,
      y,
      t(item.descriptionKey),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: textWrap },
      0,
      0,
    );
    this.content.push(desc);

    const affordable = item.priceCredits === undefined || CurrencyService.canAfford(item.priceCredits);
    let statusText = '';
    let statusColor: number = PALETTE.reward;
    if (owned) {
      statusText = isEquipped || !equipSlot ? t('shopEquipped') : t('shopOwned');
      statusColor = PALETTE.cyan;
    } else if (item.priceCredits !== undefined) {
      statusText = `${item.priceCredits} CREDITS`;
      // Red the instant it's out of reach — a child shouldn't have to
      // subtract two numbers to find out whether a tap will do anything.
      statusColor = affordable ? PALETTE.reward : PALETTE.danger;
    } else if (item.productId) {
      statusText = this.catalogPricesById.get(item.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
    }
    const status = this.domText.add(
      textX,
      y + desc.height + 6,
      statusText,
      { color: hexToCss(statusColor), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0,
      0,
    );
    this.content.push(status);

    const buttonY = this.panelY + this.panelH - 58;
    const buttonW = this.panelW - 24;

    if (owned && equipSlot && !isEquipped) {
      const { button, domText } = this.makeButton(width / 2, buttonY, t('shopEquip'), {
        width: buttonW,
        height: 18,
        onClick: () => {
          InventoryService.equip(equipSlot, item.id);
          this.renderCategory();
        },
      });
      this.content.push(button, domText);
    } else if (!owned) {
      const { button, domText } = this.makeButton(width / 2, buttonY, t('shopBuy'), {
        width: buttonW,
        height: 18,
        onClick: () => void this.handleBuy(item),
      });
      this.content.push(button, domText);
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
    this.leftButtonText.setText(t('shopToArchive'));
    this.setTabsVisible(false);
    this.systemLineLabel.setText('');
    this.systemLineLabel.setVisible(false);
    this.clearContent();
    const { width } = this.scale;

    const title = this.domText.add(
      width / 2,
      this.panelY + 66,
      t('shopGetCredits'),
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0.5,
      0.5,
    );
    this.content.push(title);

    let y = this.panelY + 84;
    for (const pack of CREDIT_PACKS) {
      const price = this.catalogPricesById.get(pack.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
      const { button, domText } = this.makeButton(width / 2, y, `${pack.credits} CREDITS — ${price}`, {
        width: this.panelW - 24,
        height: 18,
        onClick: () => void this.handleBuyCreditPack(pack.productId),
      });
      this.content.push(button, domText);
      y += 22;
    }

    if (!AdsService.isAdsDisabled()) {
      const { button, domText } = this.makeButton(width / 2, y + 4, `${t('shopWatchAd')} — ${EARN_AMOUNTS.rewardedAd} CREDITS`, {
        width: this.panelW - 24,
        height: 18,
        onClick: () => {
          AdsService.requestRewarded((granted) => {
            if (granted) {
              CurrencyService.earnCredits(EARN_AMOUNTS.rewardedAd, 'rewarded_ad');
              this.refreshBalance();
            }
          });
        },
      });
      this.content.push(button, domText);
    }
  }

  /** Returns from the GET CREDITS sub-view to the category grid — the counterpart to `openGetCredits`, both toggling the same contextual `leftButton`. */
  private backToMain(): void {
    this.view = 'main';
    this.leftButtonText.setText(t('shopGetCredits'));
    this.setTabsVisible(true);
    this.systemLineLabel.setVisible(true);
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
