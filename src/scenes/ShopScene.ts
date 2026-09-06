import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import type { UiStringKey } from '@/i18n/ui';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import type { DomTextHandle } from '@/ui/DomTextOverlay';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { playSfx } from '@/audio/SfxManager';
import { EventBus } from '@/core/EventBus';
import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import type { InventoryCategory } from '@/services/InventoryService';
import { PurchaseManager } from '@/services/PurchaseManager';
import { AdsService } from '@/services/AdsService';
import { SaveService } from '@/services/SaveService';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { SHOP_ITEMS } from '@/data/shop/items';
import type { ShopCategory, ShopItem } from '@/data/shop/items';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { commentOnShop } from '@/data/dialogues/shop';
import { playerTexturePrefix, skinColorsFor } from '@/data/shop/skinVisuals';
import { TrailFx } from '@/gameplay/TrailFx';
import type { TrailKind } from '@/gameplay/TrailFx';
import { FxManager } from '@/fx/FxManager';
import { PACKS } from '@/data/dialogues';

// Rail order top-to-bottom (Claude Design showroom mockup, "ХОД 3/4",
// 2026-09-06) — БЕЗ РЕК. moves to the bottom as its own visually distinct
// gold diamond instead of the earlier "premium always first" placement, so
// the mockup supersedes that older ordering call.
const CATEGORIES: ShopCategory[] = ['character', 'trail', 'death_fx', 'system', 'premium'];
const CATEGORY_LABEL: Record<ShopCategory, UiStringKey> = {
  character: 'shopCategoryCharacter',
  trail: 'shopCategoryTrail',
  death_fx: 'shopCategoryDeathFx',
  system: 'shopCategorySystem',
  premium: 'shopCategoryPremium',
};
/** Each category's own identity color — rail active-state, detail panel border, and "equipped/owned" action-button accent. Money itself is always gold regardless of category (PALETTE.reward's own doc comment). */
const CATEGORY_ACCENT: Record<ShopCategory, number> = {
  character: PALETTE.cyan,
  trail: PALETTE.cyan,
  death_fx: PALETTE.dangerAlt,
  system: PALETTE.system,
  premium: PALETTE.reward,
};
const CATEGORY_ACCENT_DIM: Record<ShopCategory, number> = {
  character: PALETTE.cyanDim,
  trail: PALETTE.cyanDim,
  death_fx: PALETTE.dangerAlt,
  system: PALETTE.systemDim,
  premium: PALETTE.goldDim,
};
/** `ShopItem.category` values that map onto an `InventoryService` equip slot — `premium` products are owned-only, never equipped. */
const INVENTORY_CATEGORY: Partial<Record<ShopCategory, InventoryCategory>> = {
  character: 'character',
  death_fx: 'death_fx',
  system: 'system',
  trail: 'trail',
};

const TOPBAR_H = 28;
const RAIL_W = 64;
const RAIL_X = 0;
const GRID_X = 70;
const DETAIL_X = 330;
const DETAIL_W = 146;
const RIGHT_COL_X = 492;
const RIGHT_COL_MIN_W = 90;
const SYSTEM_LINE_MS = 2600;
const DEATH_PREVIEW_INTERVAL_MS = 1500;

type Disposable = { destroy(): void };

interface RailHandle {
  category: ShopCategory;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  label: DomTextHandle;
  zone: Phaser.GameObjects.Zone;
  top: number;
  h: number;
}

/**
 * "SYSTEM ARCHIVE" — master-prompt §13. A full-bleed showroom (Claude Design
 * mockup "ХОД 3/4", 2026-09-06) replacing the earlier horizontal-tabs +
 * text-only-tile layout: a vertical category rail, a card grid with a real
 * preview per item (sprite / live trail / live death burst / sampled SYSTEM
 * lines), and a fixed "fitting room" detail panel on the right. `premium`
 * keeps its own hero-offer layout (real money, no grid).
 *
 * All text here renders through `DomTextOverlay` (real browser text, project
 * owner's call) instead of the game's bitmap font. Every interactive shape
 * (card, rail button, action button) is hand-drawn `Graphics` + `Zone` — not
 * `PixelButton`/`MenuTile`, both of which are hardcoded to a single cyan
 * accent and can't take this screen's gold/orange/purple category colors.
 */
export class ShopScene extends Phaser.Scene {
  private categoryIndex = 0;
  private selectedByCategory = new Map<ShopCategory, string>();
  private purchaseInProgress = false;
  private catalogPricesById = new Map<string, string>();
  private catalogLoaded = false;
  private view: 'main' | 'credits' = 'main';

  private content: Disposable[] = [];
  private railHandles: RailHandle[] = [];
  private domText!: DomTextOverlay;
  private walletLabel!: DomTextHandle;
  private chevron!: Phaser.GameObjects.Graphics;
  private systemLineLabel: DomTextHandle | null = null;
  private systemLineTimer: number | null = null;

  // Live preview state — trail (per-frame) and death FX (timer-driven).
  // Both are torn down at the top of every `renderCategory()` call and never
  // survive a category/selection switch (CLAUDE.md #9 — no stray per-frame
  // work left running for a screen the player isn't looking at).
  private previewTrailFx: TrailFx | null = null;
  private previewTrailSprite: Phaser.GameObjects.Sprite | null = null;
  private previewTrailState = { x: 0, y: 0, vx: 0, vy: 0, flipX: false };
  private previewTrailBoxCx = 0;
  private previewTrailBoxCy = 0;
  private previewFx: FxManager | null = null;
  private deathPreviewTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // This scene instance is reused every time the player reopens the shop
    // (`MainMenuScene.openOverlay` calls `scene.launch` again on the same
    // persistent Scene object, which re-runs `create()`) — array fields
    // populated during a previous `create()` must be reset here, or they'd
    // keep referencing Zones/Graphics already destroyed by that previous
    // session's shutdown, and the next `setRailVisible`/`disableInteractive`
    // call throws on the first stale entry it reaches.
    this.railHandles = [];
    this.content = [];
    this.previewFx = null;
    this.view = 'main';

    buildRadialGridBackdrop(this, width, height, 'shop-backdrop', 0.55, 0.3);
    fadeIn(this);

    this.domText = new DomTextOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.domText.destroy();
      this.teardownLivePreview();
      this.previewFx?.destroy();
    });

    this.buildTopbar(width);
    this.buildRail();

    EventBus.on('system:comment', this.handleSystemComment, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('system:comment', this.handleSystemComment, this);
      if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    });

    commentOnShop('open');
    void this.loadCatalog();
    this.renderCategory();
  }

  override update(_time: number, delta: number): void {
    if (!this.previewTrailFx) return;
    this.stepTrailPreview(delta);
  }

  // ---- topbar ----------------------------------------------------------

  private buildTopbar(width: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.bgIndigo, 1);
    bg.fillRect(0, 0, width, TOPBAR_H);
    bg.lineStyle(1, PALETTE.cyanDim, 0.7);
    bg.lineBetween(0, TOPBAR_H, width, TOPBAR_H);

    this.chevron = this.add.graphics();
    this.chevron.lineStyle(2, PALETTE.cyan, 1);
    this.chevron.beginPath();
    this.chevron.moveTo(18, 9);
    this.chevron.lineTo(11, 14);
    this.chevron.lineTo(18, 19);
    this.chevron.strokePath();
    this.add.rectangle(18, 14, 20, 20, PALETTE.metalMid, 0.001).setDepth(-1);
    const chevronZone = this.add.zone(18, 14, 32, 28).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    chevronZone.on('pointerup', () => {
      playSfx('uiClick');
      if (this.view === 'main') this.scene.stop();
      else this.backToMain();
    });

    this.domText.add(
      36,
      14,
      t('shopTitle'),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), scale: 2, bold: true },
      0,
      0.5,
    );

    const walletW = 108;
    const walletX = width - 8 - walletW;
    const walletBg = this.add.graphics();
    walletBg.fillStyle(PALETTE.metalDark, 1);
    walletBg.lineStyle(1, PALETTE.goldDim, 1);
    walletBg.fillRect(walletX, 4, walletW, 20);
    walletBg.strokeRect(walletX, 4, walletW, 20);
    this.walletLabel = this.domText.add(
      walletX + walletW / 2 - 8,
      14,
      this.balanceText(),
      { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0.5,
      0.5,
    );
    const plus = this.add.graphics();
    plus.fillStyle(PALETTE.goldDim, 1);
    plus.fillRect(walletX + walletW - 16, 8, 12, 12);
    plus.fillStyle(PALETTE.reward, 1);
    plus.fillRect(walletX + walletW - 12, 11, 4, 6);
    plus.fillRect(walletX + walletW - 14, 13, 8, 2);
    const walletZone = this.add.zone(walletX + walletW / 2, 14, walletW, 20).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    walletZone.on('pointerup', () => {
      playSfx('uiClick');
      if (this.view === 'main') this.openGetCredits();
    });

    // "SYSTEM ONLINE" is purely decorative status text — only shown once the
    // wallet pill has real breathing room to its left (a 480px-wide canvas
    // never does), so it never fights the wallet for space.
    if (walletX >= 470) {
      const dot = this.add.circle(width - 118, 14, 2.5, PALETTE.cyan, 1);
      this.tweens.add({ targets: dot, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
      this.domText.add(
        width - 112,
        14,
        'SYSTEM ONLINE',
        { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
        0,
        0.5,
      );
    }
  }

  private balanceText(): string {
    return String(CurrencyService.getBalance());
  }

  private refreshBalance(): void {
    this.walletLabel.setText(this.balanceText());
  }

  private async loadCatalog(): Promise<void> {
    const catalog = await PurchaseManager.getCatalog();
    for (const [id, product] of catalog) this.catalogPricesById.set(id, product.price);
    this.catalogLoaded = true;
    if (this.view === 'main') this.renderCategory();
  }

  // ---- rail --------------------------------------------------------------

  /** Same procedural glyphs the old tab bar used (CLAUDE.md #3), just repainted per the new spec's БЕЗ РЕК. diamond. */
  private drawCategoryIcon(g: Phaser.GameObjects.Graphics, category: ShopCategory, cx: number, cy: number, color: number): void {
    switch (category) {
      case 'premium':
        g.fillStyle(color, 1);
        g.save();
        g.translateCanvas(cx, cy);
        g.rotateCanvas(Math.PI / 4);
        g.fillRect(-6, -6, 12, 12);
        g.restore();
        break;
      case 'character':
        g.fillStyle(PALETTE.white, 1);
        g.fillRect(cx - 3, cy - 5, 6, 5);
        g.fillStyle(color, 1);
        g.fillRect(cx - 2, cy - 4, 4, 2);
        g.fillStyle(PALETTE.white, 0.85);
        g.fillRect(cx - 4, cy, 8, 4);
        break;
      case 'death_fx':
        g.fillStyle(color, 1);
        g.fillRect(cx - 1, cy - 5, 2, 10);
        g.fillRect(cx - 5, cy - 1, 10, 2);
        g.fillRect(cx - 3, cy - 3, 2, 2);
        g.fillRect(cx + 1, cy - 3, 2, 2);
        g.fillRect(cx - 3, cy + 1, 2, 2);
        g.fillRect(cx + 1, cy + 1, 2, 2);
        break;
      case 'system':
        g.lineStyle(1.4, color, 1);
        g.strokeRect(cx - 4, cy - 4, 8, 8);
        g.fillStyle(color, 1);
        g.fillRect(cx - 6, cy - 3, 2, 1);
        g.fillRect(cx - 6, cy + 2, 2, 1);
        g.fillRect(cx + 4, cy - 3, 2, 1);
        g.fillRect(cx + 4, cy + 2, 2, 1);
        break;
      case 'trail':
        g.fillStyle(color, 1);
        g.fillRect(cx + 2, cy - 2, 4, 4);
        g.fillStyle(color, 0.55);
        g.fillRect(cx - 3, cy + 1, 3, 3);
        g.fillStyle(color, 0.25);
        g.fillRect(cx - 6, cy + 3, 2, 2);
        break;
    }
  }

  private buildRail(): void {
    const { height } = this.scale;
    const rowH = 44;
    const gap = 2;
    let y = TOPBAR_H + 4;

    CATEGORIES.forEach((category, i) => {
      const isLast = i === CATEGORIES.length - 1;
      const rowTop = y;
      const rowHeight = isLast ? height - rowTop : rowH;
      const cy = rowTop + rowHeight / 2;

      const bg = this.add.graphics();
      const icon = this.add.graphics();
      const label = this.domText.add(
        RAIL_W / 2,
        rowTop + rowHeight - 9,
        t(CATEGORY_LABEL[category]),
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: RAIL_W - 6 },
        0.5,
        0.5,
      );

      const zone = this.add
        .zone(RAIL_X + RAIL_W / 2, cy, RAIL_W, rowHeight)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        this.selectCategory(i);
      });

      this.railHandles.push({ category, bg, icon, label, zone, top: rowTop, h: rowHeight });
      y += rowHeight + gap;
    });

    this.refreshRail();
  }

  private refreshRail(): void {
    const active = this.currentCategory();
    for (const rail of this.railHandles) {
      const isActive = rail.category === active;
      const accent = CATEGORY_ACCENT[rail.category];

      rail.bg.clear();
      if (isActive) {
        rail.bg.fillStyle(PALETTE.panelHover, 1);
        rail.bg.fillRect(RAIL_X, rail.top, RAIL_W, rail.h);
        rail.bg.fillStyle(accent, 1);
        rail.bg.fillRect(RAIL_X, rail.top, 3, rail.h);
      }

      rail.icon.clear();
      this.drawCategoryIcon(rail.icon, rail.category, RAIL_W / 2, rail.top + rail.h / 2 - 6, isActive ? accent : PALETTE.cyanDim);
      rail.label.setColor(hexToCss(isActive ? PALETTE.white : PALETTE.labelMuted));
    }
  }

  private setRailVisible(visible: boolean): void {
    for (const rail of this.railHandles) {
      rail.bg.setVisible(visible);
      rail.icon.setVisible(visible);
      rail.label.setVisible(visible);
      if (visible) rail.zone.setInteractive({ useHandCursor: true });
      else rail.zone.disableInteractive();
    }
  }

  private selectCategory(index: number): void {
    if (this.categoryIndex === index) return;
    this.categoryIndex = index;
    this.renderCategory();
  }

  private currentCategory(): ShopCategory {
    return CATEGORIES[this.categoryIndex]!;
  }

  // ---- data helpers --------------------------------------------------

  private isOwned(item: ShopItem): boolean {
    if (item.category === 'premium') return InventoryService.isPremiumOwned(item.productId ?? item.id);
    const category = INVENTORY_CATEGORY[item.category];
    return category ? InventoryService.isOwned(category, item.id) : false;
  }

  private isUnlocked(item: ShopItem): boolean {
    if (!item.unlockCondition) return true;
    if (item.unlockCondition.kind === 'campaign_complete') {
      return SaveService.getCompletedLevels().length >= getAllLevels().length;
    }
    return false;
  }

  /**
   * A `campaign_complete` item has no price/productId — it was never meant
   * to be "bought" once its condition is met. Without this, the first time
   * the condition became true `buildActionRow` would still fall into its
   * `!owned` branch and draw a "КУПИТЬ" button that does nothing (`handleBuy`
   * no-ops without a price or productId). Granting it into the inventory the
   * moment the shop notices the condition is met turns that into a normal
   * "ЭКИПИРОВАТЬ" state instead — called once per `renderCategory()`, cheap
   * and idempotent (`InventoryService.unlock` already no-ops if owned).
   */
  private syncProgressUnlocks(): void {
    for (const item of SHOP_ITEMS) {
      if (item.unlockCondition?.kind !== 'campaign_complete') continue;
      if (!this.isUnlocked(item) || this.isOwned(item)) continue;
      const slot = INVENTORY_CATEGORY[item.category];
      if (slot) InventoryService.unlock(slot, item.id);
    }
  }

  /** Bundle-exclusive cosmetics (no price, no productId) show once owned; a `campaign_complete`-gated item shows always, locked or not, as its own dedicated "???" card (master-prompt §28 honesty — never a fake purchase, but a real progress goal is fine to display ahead of time). */
  private visibleItems(category: ShopCategory): ShopItem[] {
    return SHOP_ITEMS.filter((item) => {
      if (item.category !== category) return false;
      if (item.unlockCondition?.kind === 'campaign_complete') return true;
      if (item.priceCredits !== undefined || item.productId !== undefined) return true;
      return this.isOwned(item);
    });
  }

  private selectedItem(category: ShopCategory): ShopItem {
    const items = this.visibleItems(category);
    const selectedId = this.selectedByCategory.get(category);
    return items.find((item) => item.id === selectedId) ?? items[0]!;
  }

  // ---- shared render plumbing -----------------------------------------

  private clearContent(): void {
    for (const item of this.content) item.destroy();
    this.content = [];
  }

  private teardownLivePreview(): void {
    this.previewTrailFx?.destroy();
    this.previewTrailFx = null;
    this.previewTrailSprite = null;
    if (this.deathPreviewTimer) {
      this.deathPreviewTimer.remove();
      this.deathPreviewTimer = null;
    }
  }

  private renderCategory(): void {
    this.teardownLivePreview();
    this.clearContent();
    this.syncProgressUnlocks();
    const category = this.currentCategory();

    if (category === 'premium') this.renderPremiumShowroom();
    else this.renderCosmeticShowroom(category);

    this.refreshRail();
  }

  private sectionHeaderText(category: ShopCategory, items: ShopItem[]): string {
    const owned = items.filter((item) => this.isOwned(item)).length;
    return `${t(CATEGORY_LABEL[category])} · ${owned} ${t('shopOf')} ${items.length} ${t('shopUnlockedSuffix')}`;
  }

  // ---- cosmetic categories (character / trail / death_fx / system) ------

  private renderCosmeticShowroom(category: ShopCategory): void {
    const items = this.visibleItems(category);
    if (!this.selectedByCategory.has(category)) this.selectedByCategory.set(category, items[0]!.id);
    const selected = this.selectedItem(category);

    const header = this.domText.add(
      GRID_X,
      32,
      this.sectionHeaderText(category, items),
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: DETAIL_X - GRID_X - 8, clampLines: 1 },
      0,
      0,
    );
    this.content.push(header);

    const cols = items.length > 4 ? 3 : 2;
    const cardW = cols === 3 ? 78 : 120;
    const gapX = cols === 3 ? 9 : 10;
    const gapY = 8;
    const gridTop = 46;
    const rows = Math.ceil(items.length / cols);
    // `character` is the one category that can grow past 6 items (the
    // SYSTEM ACCESS bundle's exclusive ERROR 404 skin, plus the
    // campaign-complete-locked CORE skin, both stacking onto the base 5) —
    // shrink the row height to whatever still fits the fixed 270px canvas
    // instead of letting a 3rd row run off the bottom edge.
    const bottomMargin = 6;
    const cardH = Math.min(92, Math.floor((this.scale.height - gridTop - bottomMargin - (rows - 1) * gapY) / rows));

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = GRID_X + col * (cardW + gapX);
      const y = gridTop + row * (cardH + gapY);
      this.buildShowroomCard(item, x, y, cardW, cardH, category, item.id === selected.id);
    });

    this.buildDetailPanel(category, selected);
    this.buildRightColumn(category, items);
  }

  private buildShowroomCard(
    item: ShopItem,
    x: number,
    y: number,
    w: number,
    h: number,
    category: ShopCategory,
    isSelected: boolean,
  ): void {
    const unlocked = this.isUnlocked(item);
    const owned = unlocked && this.isOwned(item);
    const equipSlot = INVENTORY_CATEGORY[category];
    const isEquipped = owned && equipSlot ? InventoryService.getEquipped(equipSlot) === item.id : false;
    const affordable = item.priceCredits === undefined || CurrencyService.canAfford(item.priceCredits);
    const previewH = Math.round(h * 0.65);
    const accent = CATEGORY_ACCENT[category];

    const g = this.add.graphics();
    this.content.push(g);

    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(unlocked ? PALETTE.metalDark : PALETTE.metalDark, 1);
    g.fillRect(x, y, w, previewH);

    let borderColor: number = PALETTE.metalEdge;
    let borderWidth = 1;
    if (isEquipped) {
      borderColor = accent;
      borderWidth = 2;
    } else if (!unlocked) {
      borderColor = PALETTE.metalMid;
    } else if (!owned && item.priceCredits !== undefined) {
      borderColor = affordable ? PALETTE.goldDim : PALETTE.metalMid;
    }
    // The card currently shown in the fitting-room panel gets its own
    // highlight, distinct from "equipped" — otherwise clicking around an
    // unowned item's card to preview it gives no feedback about which one
    // is now on display.
    if (isSelected && !isEquipped) {
      borderColor = PALETTE.white;
      borderWidth = Math.max(borderWidth, 1.5);
    }
    g.lineStyle(borderWidth, borderColor, 1);
    g.strokeRect(x + borderWidth / 2, y + borderWidth / 2, w - borderWidth, h - borderWidth);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.lineBetween(x, y + previewH, x + w, y + previewH);

    // Preview glyph.
    const cx = x + w / 2;
    const cy = y + previewH / 2;
    if (!unlocked) {
      this.drawLockGlyph(g, cx, cy);
    } else {
      this.drawCardPreview(category, item, cx, cy, w, previewH, owned && affordable);
    }

    // Label plate.
    const plateBg = isEquipped ? PALETTE.panelHover : PALETTE.metalMid;
    g.fillStyle(plateBg, 1);
    g.fillRect(x, y + previewH, w, h - previewH);

    const nameText = unlocked ? t(item.nameKey) : t('shopLockedName');
    const name = this.domText.add(
      x + 6,
      y + previewH + 5,
      nameText,
      { color: hexToCss(unlocked ? PALETTE.white : PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true, wordWrapWidth: w - 12, clampLines: 1 },
      0,
      0,
    );
    this.content.push(name);

    let subtitleText = '';
    let subtitleColor: number = PALETTE.labelMuted;
    if (!unlocked) {
      subtitleText = t('shopLockedCondition');
      subtitleColor = PALETTE.system;
    } else if (isEquipped) {
      subtitleText = t('shopEquipped');
      subtitleColor = accent;
    } else if (owned) {
      subtitleText = t('shopOwned');
      subtitleColor = PALETTE.labelMuted;
    } else if (item.priceCredits !== undefined) {
      subtitleText = `${item.priceCredits} CR`;
      subtitleColor = affordable ? PALETTE.reward : PALETTE.goldDim;
    }
    if (subtitleText) {
      const subtitle = this.domText.add(
        x + 6,
        y + previewH + 17,
        subtitleText,
        { color: hexToCss(subtitleColor), strokeColor: hexToCss(PALETTE.outline), scale: 1, wordWrapWidth: w - 12, clampLines: 1 },
        0,
        0,
      );
      this.content.push(subtitle);
    }

    if (isEquipped) {
      const badge = this.add.circle(x + w - 6, y + 6, 5, accent, 1);
      const check = this.add.graphics();
      check.lineStyle(1.4, PALETTE.bgVoid, 1);
      check.beginPath();
      check.moveTo(x + w - 8.2, y + 6);
      check.lineTo(x + w - 6.5, y + 8);
      check.lineTo(x + w - 3.5, y + 3.5);
      check.strokePath();
      this.content.push(badge, check);
    }

    if (unlocked) {
      const zone = this.add.zone(cx, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        this.selectedByCategory.set(category, item.id);
        this.renderCategory();
      });
      this.content.push(zone);
    }
  }

  private drawLockGlyph(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    g.fillStyle(PALETTE.metalEdge, 1);
    g.fillRect(cx - 12, cy - 2, 24, 19);
    g.lineStyle(3, PALETTE.metalEdge, 1);
    g.strokeRect(cx - 6, cy - 15, 12, 13);
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(cx - 2, cy + 3, 4, 7);
  }

  private drawCardPreview(
    category: ShopCategory,
    item: ShopItem,
    cx: number,
    cy: number,
    w: number,
    previewH: number,
    fullColor: boolean,
  ): void {
    if (category === 'character') {
      const prefix = playerTexturePrefix(item.id);
      if (this.textures.exists(`${prefix}-idle-0`)) {
        const sprite = this.add.sprite(cx, cy + previewH / 2 - 4, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(1.05);
        if (!fullColor) sprite.setTint(PALETTE.metalEdge);
        this.content.push(sprite);
      }
      return;
    }

    const g = this.add.graphics();
    this.content.push(g);
    const dim = fullColor ? 1 : 0.35;

    if (category === 'trail') this.drawTrailGlyph(g, item.id as TrailKind, cx, cy, dim);
    else if (category === 'death_fx') this.drawDeathFxGlyph(g, item.id, cx, cy, dim);
    else if (category === 'system') this.drawSystemGlyph(g, cx, cy, dim);
    void w;
  }

  private drawTrailGlyph(g: Phaser.GameObjects.Graphics, kind: TrailKind, cx: number, cy: number, dim: number): void {
    switch (kind) {
      case 'data_trail':
        g.fillStyle(PALETTE.cyanDim, dim);
        g.fillRect(cx - 16, cy + 6, 4, 4);
        g.fillStyle(PALETTE.cyan, dim * 0.75);
        g.fillRect(cx - 6, cy, 4, 4);
        g.fillStyle(PALETTE.cyan, dim);
        g.fillRect(cx + 6, cy - 6, 5, 5);
        break;
      case 'launch':
        g.fillStyle(PALETTE.reward, dim);
        g.fillRect(cx - 2, cy - 10, 4, 4);
        g.fillStyle(PALETTE.dangerAlt, dim);
        g.fillRect(cx - 10, cy, 4, 4);
        g.fillRect(cx + 8, cy + 2, 4, 4);
        g.fillStyle(PALETTE.reward, dim * 0.7);
        g.fillRect(cx + 2, cy + 10, 3, 3);
        break;
      case 'interference':
        g.fillStyle(PALETTE.white, dim);
        g.fillRect(cx - 14, cy - 6, 28, 2);
        g.fillStyle(PALETTE.metalEdge, dim);
        g.fillRect(cx - 10, cy, 22, 2);
        g.fillStyle(PALETTE.white, dim * 0.6);
        g.fillRect(cx - 16, cy + 6, 24, 2);
        break;
      case 'beep7':
        g.fillStyle(PALETTE.metalEdge, dim);
        g.fillRect(cx - 8, cy - 2, 16, 6);
        g.fillStyle(PALETTE.system, dim);
        g.fillRect(cx - 2, cy + 4, 4, 4);
        break;
    }
  }

  private drawDeathFxGlyph(g: Phaser.GameObjects.Graphics, id: string, cx: number, cy: number, dim: number): void {
    const spread = id === 'data_wipe' ? 1.5 : id === 'glitch' ? 1.2 : 1;
    g.fillStyle(PALETTE.white, dim);
    g.fillRect(cx - 1, cy - 5 * spread, 2, 10 * spread);
    g.fillRect(cx - 5 * spread, cy - 1, 10 * spread, 2);
    g.fillStyle(id === 'data_wipe' ? PALETTE.white : PALETTE.dangerAlt, dim);
    g.fillRect(cx - 3 * spread, cy - 3 * spread, 2, 2);
    g.fillRect(cx + 1 * spread, cy - 3 * spread, 2, 2);
    g.fillRect(cx - 3 * spread, cy + 1 * spread, 2, 2);
    g.fillRect(cx + 1 * spread, cy + 1 * spread, 2, 2);
    if (id !== 'static') {
      g.fillStyle(PALETTE.cyan, dim * 0.7);
      g.fillRect(cx - 10, cy + 8, 20, 1);
    }
  }

  private drawSystemGlyph(g: Phaser.GameObjects.Graphics, cx: number, cy: number, dim: number): void {
    g.lineStyle(1.6, PALETTE.system, dim);
    g.strokeRect(cx - 14, cy - 9, 24, 15);
    g.fillStyle(PALETTE.system, dim);
    g.fillRect(cx - 10, cy - 4, 10, 2);
    g.fillRect(cx - 10, cy, 6, 2);
    g.fillStyle(PALETTE.system, dim * 0.8);
    g.fillRect(cx + 4, cy + 9, 6, 5);
  }

  // ---- detail panel ("fitting room") ------------------------------------

  private detailFrame(accent: number, headerText: string, top = 32, height = 206): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.lineStyle(1, accent, 1);
    g.fillRect(DETAIL_X, top, DETAIL_W, height);
    g.strokeRect(DETAIL_X, top, DETAIL_W, height);
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(DETAIL_X, top, DETAIL_W, 18);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.lineBetween(DETAIL_X, top + 18, DETAIL_X + DETAIL_W, top + 18);
    this.content.push(g);

    const header = this.domText.add(
      DETAIL_X + DETAIL_W / 2,
      top + 9,
      headerText,
      { color: hexToCss(accent), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 9, wordWrapWidth: DETAIL_W - 12 },
      0.5,
      0.5,
    );
    this.content.push(header);
  }

  private buildDetailPanel(category: ShopCategory, item: ShopItem): void {
    const accent = CATEGORY_ACCENT[category];
    const unlocked = this.isUnlocked(item);

    if (category === 'character') {
      this.detailFrame(PALETTE.cyanDim, t('shopFittingRoom'));
      this.buildCharacterPreview(item, unlocked);
    } else if (category === 'trail') {
      this.detailFrame(PALETTE.cyanDim, t('shopTrialRun'));
      this.buildTrailPreview(item);
    } else if (category === 'death_fx') {
      this.detailFrame(PALETTE.dangerAlt, t('shopDeathPreview'));
      this.buildDeathFxPreview(item, unlocked);
    } else {
      this.detailFrame(PALETTE.systemDim, t('shopSystemSample'));
      this.buildSystemPreview(item);
    }

    this.buildNameRarityDesc(item, 122);
    this.buildActionRow(category, item, accent, unlocked);
  }

  private buildNameRarityDesc(item: ShopItem, y: number): void {
    const name = this.domText.add(
      DETAIL_X + 8,
      y,
      t(item.nameKey),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true, wordWrapWidth: DETAIL_W - 16, clampLines: 1 },
      0,
      0,
    );
    this.content.push(name);

    const desc = this.domText.add(
      DETAIL_X + 8,
      y + 20,
      t(item.descriptionKey),
      { color: hexToCss(PALETTE.textMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 9, wordWrapWidth: DETAIL_W - 16, clampLines: 2 },
      0,
      0,
    );
    this.content.push(desc);
  }

  private buildActionRow(category: ShopCategory, item: ShopItem, accent: number, unlocked: boolean): void {
    const equipSlot = INVENTORY_CATEGORY[category];
    const owned = unlocked && this.isOwned(item);
    const isEquipped = owned && equipSlot ? InventoryService.getEquipped(equipSlot) === item.id : false;
    const affordable = item.priceCredits === undefined || CurrencyService.canAfford(item.priceCredits);

    const priceY = 180;
    if (!unlocked) {
      const cond = this.domText.add(
        DETAIL_X + 8,
        priceY,
        t('shopLockedCondition'),
        { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
        0,
        0,
      );
      this.content.push(cond);
      return;
    }

    if (owned && item.priceCredits !== undefined) {
      const remain = CurrencyService.getBalance();
      const priceLabel = this.domText.add(
        DETAIL_X + 8,
        priceY,
        `${t('shopWillRemain')} ${remain}`,
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
        0,
        0,
      );
      this.content.push(priceLabel);
    } else if (!owned && item.priceCredits !== undefined) {
      const priceLabel = this.domText.add(
        DETAIL_X + 8,
        priceY,
        `${item.priceCredits} CREDITS`,
        { color: hexToCss(affordable ? PALETTE.reward : PALETTE.goldDim), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
        0,
        0,
      );
      this.content.push(priceLabel);
    } else if (!owned && item.productId) {
      const priceText = this.catalogPricesById.get(item.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
      const priceLabel = this.domText.add(
        DETAIL_X + 8,
        priceY,
        priceText,
        { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
        0,
        0,
      );
      this.content.push(priceLabel);
    }

    const btnCx = DETAIL_X + DETAIL_W / 2;
    const btnCy = 216;
    const btnW = DETAIL_W - 12;
    const btnH = 34;

    if (isEquipped) {
      this.drawActionButton(btnCx, btnCy, btnW, btnH, t('shopEquipped'), accent, CATEGORY_ACCENT_DIM[category], false, () => {});
    } else if (owned) {
      const onEquip = (): void => {
        if (!equipSlot) return;
        InventoryService.equip(equipSlot, item.id);
        this.renderCategory();
      };
      this.drawActionButton(btnCx, btnCy, btnW, btnH, t('shopEquip'), accent, CATEGORY_ACCENT_DIM[category], true, onEquip);
    } else if (item.priceCredits !== undefined || item.productId) {
      const onBuy = (): void => void this.handleBuy(item);
      this.drawActionButton(btnCx, btnCy, btnW, btnH, t('shopBuy'), PALETTE.reward, PALETTE.goldEdge, true, onBuy);
    }
    // `unlocked && !owned` with neither a price nor a productId would mean a
    // `campaign_complete` item slipped past `syncProgressUnlocks()` — no
    // button is the honest state (never a dead "КУПИТЬ" that does nothing).
  }

  /** Hand-drawn so every category/money accent is reachable — `PixelButton`/`MenuTile` are both hardcoded to cyan. `sole` is a flat rect drawn a few px below the face, the same "pressed-in shadow" trick `PixelButton` draws via its underline, just as a full base coat here for the chunkier showroom buttons. */
  private drawActionButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    face: number,
    sole: number,
    interactive: boolean,
    onClick: () => void,
  ): void {
    const g = this.add.graphics();
    const textColor = interactive ? PALETTE.bgVoid : PALETTE.white;
    const domLabel = this.domText.add(
      cx,
      cy,
      label.toUpperCase(),
      { color: hexToCss(textColor), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true },
      0.5,
      0.5,
    );
    this.content.push(g, domLabel);

    const redraw = (hover: boolean, press: boolean): void => {
      g.clear();
      const offsetY = press ? 2 : 0;
      g.fillStyle(sole, 1);
      g.fillRect(cx - w / 2, cy - h / 2 + 4, w, h);
      g.fillStyle(face, hover ? 1 : 0.92);
      g.fillRect(cx - w / 2, cy - h / 2 + offsetY, w, h - 4);
      g.lineStyle(1.5, interactive ? PALETTE.white : PALETTE.metalEdge, interactive ? 0.9 : 0.6);
      g.strokeRect(cx - w / 2, cy - h / 2 + offsetY, w, h - 4);
      domLabel.setPosition(cx, cy + offsetY);
    };
    redraw(false, false);

    if (!interactive) return;
    const zone = this.add.zone(cx, cy, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => redraw(true, false));
    zone.on('pointerout', () => redraw(false, false));
    zone.on('pointerdown', () => redraw(true, true));
    zone.on('pointerup', () => {
      redraw(true, false);
      playSfx('uiClick');
      onClick();
    });
    this.content.push(zone);
  }

  // ---- character preview -------------------------------------------------

  private buildCharacterPreview(item: ShopItem, unlocked: boolean): void {
    const boxX = DETAIL_X + 8;
    const boxY = 54;
    const boxW = DETAIL_W - 16;
    const boxH = 62;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.fillRect(boxX, boxY, boxW, boxH);
    g.strokeRect(boxX, boxY, boxW, boxH);
    this.content.push(g);

    if (!unlocked) {
      this.drawLockGlyph(g, boxX + boxW / 2, boxY + boxH / 2);
      return;
    }

    const visor = skinColorsFor(item.id)?.visor ?? PALETTE.cyan;
    const cone = this.add.graphics();
    cone.fillStyle(visor, 0.18);
    cone.fillTriangle(boxX + boxW / 2 - 12, boxY + 2, boxX + boxW / 2 + 12, boxY + 2, boxX + boxW / 2, boxY + boxH - 2);
    this.content.push(cone);

    const prefix = playerTexturePrefix(item.id);
    if (this.textures.exists(`${prefix}-idle-0`)) {
      const sprite = this.add.sprite(boxX + boxW / 2, boxY + boxH - 2, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(1.3);
      if (this.anims.exists(`${prefix}-idle`)) sprite.play(`${prefix}-idle`);
      this.content.push(sprite);
    }
  }

  // ---- trail preview (live TrailFx) ---------------------------------------

  private buildTrailPreview(item: ShopItem): void {
    const boxX = DETAIL_X + 8;
    const boxY = 54;
    const boxW = DETAIL_W - 16;
    const boxH = 62;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.fillRect(boxX, boxY, boxW, boxH);
    g.strokeRect(boxX, boxY, boxW, boxH);
    this.content.push(g);

    this.previewTrailBoxCx = boxX + boxW / 2;
    this.previewTrailBoxCy = boxY + boxH - 4;
    this.previewTrailState = { x: this.previewTrailBoxCx, y: this.previewTrailBoxCy, vx: 60, vy: 0, flipX: false };

    const kind = item.id as TrailKind;
    this.previewTrailFx = new TrailFx(this, kind, this.previewTrailBoxCx, this.previewTrailBoxCy);

    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    if (this.textures.exists(`${prefix}-idle-0`)) {
      const sprite = this.add.sprite(this.previewTrailBoxCx, this.previewTrailBoxCy, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(0.75);
      this.previewTrailSprite = sprite;
      this.content.push(sprite);
    }

    // Ownership check happens once here rather than gating `update()` per
    // frame — an unowned trail still previews live (that's the entire point
    // of a fitting room), it just can't be equipped yet (`buildActionRow`).
    void item;
  }

  private stepTrailPreview(delta: number): void {
    const boxHalfW = (DETAIL_W - 16) / 2 - 8;
    const periodMs = 1400;
    this.previewTrailState.x += (this.previewTrailState.vx * delta) / 1000;
    if (this.previewTrailState.x > this.previewTrailBoxCx + boxHalfW) {
      this.previewTrailState.vx = -Math.abs(this.previewTrailState.vx);
      this.previewTrailState.flipX = true;
    } else if (this.previewTrailState.x < this.previewTrailBoxCx - boxHalfW) {
      this.previewTrailState.vx = Math.abs(this.previewTrailState.vx);
      this.previewTrailState.flipX = false;
    }

    const phase = (this.time.now % periodMs) / periodMs;
    this.previewTrailState.vy = phase < 0.5 ? -260 * Math.sin(phase * Math.PI * 2) : 0;
    if (phase < 0.02 && this.previewTrailFx) this.previewTrailFx.onJump(this.previewTrailState.x, this.previewTrailBoxCy);

    if (this.previewTrailSprite) {
      this.previewTrailSprite.setPosition(Math.round(this.previewTrailState.x), this.previewTrailBoxCy);
      this.previewTrailSprite.setFlipX(this.previewTrailState.flipX);
    }
    this.previewTrailFx?.update(this.time.now, delta, this.previewTrailState, true);
  }

  // ---- death FX preview (real FxManager burst, looped) --------------------

  private buildDeathFxPreview(item: ShopItem, unlocked: boolean): void {
    const boxX = DETAIL_X + 8;
    const boxY = 54;
    const boxW = DETAIL_W - 16;
    const boxH = 62;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.fillRect(boxX, boxY, boxW, boxH);
    g.strokeRect(boxX, boxY, boxW, boxH);
    this.content.push(g);
    if (!unlocked) {
      this.drawLockGlyph(g, boxX + boxW / 2, boxY + boxH / 2);
      return;
    }

    const cx = boxX + boxW / 2;
    const cy = boxY + boxH - 6;
    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    let sprite: Phaser.GameObjects.Sprite | null = null;
    if (this.textures.exists(`${prefix}-idle-0`)) {
      sprite = this.add.sprite(cx, cy, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(0.85);
      this.content.push(sprite);
    }

    this.previewFx ??= new FxManager(this);
    const variant = item.id as 'static' | 'glitch' | 'data_wipe';
    const trigger = (): void => {
      if (!sprite) return;
      this.previewFx?.deathBurst(cx, cy - 8, variant);
      sprite.setVisible(false);
      this.time.delayedCall(240, () => sprite?.setVisible(true));
    };
    trigger();
    this.deathPreviewTimer = this.time.addEvent({ delay: DEATH_PREVIEW_INTERVAL_MS, loop: true, callback: trigger });
  }

  // ---- system voice preview (real sampled dialogue lines) -----------------

  private buildSystemPreview(item: ShopItem): void {
    const boxX = DETAIL_X + 8;
    const boxY = 54;
    const boxW = DETAIL_W - 16;
    const rowH = 15;

    const pool = (PACKS as Record<string, (typeof PACKS)['standard']>)[item.id];
    const lines = pool ? [pool.general[0], pool.fall[0], pool.successful_adaptation[0]].filter((l): l is NonNullable<typeof l> => !!l) : [];

    if (lines.length === 0) {
      const fallback = this.domText.add(
        boxX,
        boxY + 4,
        t('shopSystemSampleUnavailable'),
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 9, wordWrapWidth: boxW },
        0,
        0,
      );
      this.content.push(fallback);
      return;
    }

    lines.forEach((line, i) => {
      const y = boxY + i * (rowH + 2);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.systemDim, 0.35);
      g.fillRect(boxX, y, boxW, rowH);
      g.fillStyle(PALETTE.system, 1);
      g.fillRect(boxX, y, 2, rowH);
      this.content.push(g);

      const text = this.domText.add(
        boxX + 5,
        y + rowH / 2,
        line.ru.toUpperCase(),
        { color: hexToCss(PALETTE.systemLight), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 9, clampLines: 1, wordWrapWidth: boxW - 8 },
        0,
        0.5,
      );
      this.content.push(text);
    });
  }

  // ---- right column (SYSTEM comment [+ collection], W >= ~600) -----------

  private buildRightColumn(category: ShopCategory, items: ShopItem[]): void {
    const width = this.scale.width;
    const colW = width - RIGHT_COL_X - 8;
    if (colW < RIGHT_COL_MIN_W) {
      this.systemLineLabel = null;
      return;
    }

    const systemH = category === 'character' ? 96 : 206;
    const sysBg = this.add.rectangle(RIGHT_COL_X, 32, colW, systemH, PALETTE.system, 0.12).setOrigin(0, 0);
    const sysEdge = this.add.rectangle(RIGHT_COL_X, 32, 2, systemH, PALETTE.system, 1).setOrigin(0, 0);
    this.content.push(sysBg, sysEdge);

    const heading = this.domText.add(
      RIGHT_COL_X + 8,
      40,
      'SYSTEM',
      { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0,
      0,
    );
    this.content.push(heading);
    const label = this.domText.add(
      RIGHT_COL_X + 8,
      56,
      '',
      { color: hexToCss(PALETTE.systemLight), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 10, wordWrapWidth: colW - 16, clampLines: 6 },
      0,
      0,
    );
    this.content.push({ destroy: () => label.destroy() });
    this.systemLineLabel = label;

    if (category !== 'character') return;

    const collY = 32 + systemH + 10;
    const collH = 206 - systemH - 10;
    const collBg = this.add.rectangle(RIGHT_COL_X, collY, colW, collH, PALETTE.metalDark, 1).setOrigin(0, 0);
    this.content.push(collBg);

    const collHeading = this.domText.add(
      RIGHT_COL_X + 8,
      collY + 8,
      t('shopCollection'),
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 9 },
      0,
      0,
    );
    this.content.push(collHeading);

    const chipSize = 9;
    const chipGap = 3;
    const perRow = Math.max(1, Math.floor((colW - 16) / (chipSize + chipGap)));
    items.forEach((item, i) => {
      const owned = this.isUnlocked(item) && this.isOwned(item);
      const chipColor = owned ? skinColorsFor(item.id)?.visor ?? PALETTE.cyan : PALETTE.metalEdge;
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const chip = this.add.rectangle(
        RIGHT_COL_X + 8 + col * (chipSize + chipGap),
        collY + 22 + row * (chipSize + chipGap),
        chipSize,
        chipSize,
        chipColor,
        1,
      ).setOrigin(0, 0);
      this.content.push(chip);
    });

    const ownedCount = items.filter((item) => this.isUnlocked(item) && this.isOwned(item)).length;
    const count = this.domText.add(
      RIGHT_COL_X + 8,
      collY + collH - 16,
      `${ownedCount} / ${items.length}`,
      { color: hexToCss(PALETTE.textMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0,
      0,
    );
    this.content.push(count);
  }

  private handleSystemComment(payload: { text: string; category: string }): void {
    if (payload.category !== 'shop') return;
    if (this.view !== 'main') return;
    if (!this.systemLineLabel) return;
    this.systemLineLabel.setText(payload.text);
    if (this.systemLineTimer !== null) window.clearTimeout(this.systemLineTimer);
    this.systemLineTimer = window.setTimeout(() => this.systemLineLabel?.setText(''), SYSTEM_LINE_MS);
  }

  // ---- premium showroom (real money — the one screen with a price in ₽) --

  private renderPremiumShowroom(): void {
    const items = this.visibleItems('premium');
    if (!this.selectedByCategory.has('premium')) this.selectedByCategory.set('premium', items[0]!.id);
    const selected = this.selectedItem('premium');

    const offerX = GRID_X;
    const offerY = 40;
    const offerW = 252;
    const headerH = 26;

    if (items.length > 1) {
      const segW = offerW / items.length;
      items.forEach((it, i) => {
        const active = it.id === selected.id;
        const segX = offerX + i * segW;
        const g = this.add.graphics();
        g.fillStyle(active ? PALETTE.reward : PALETTE.goldDim, 1);
        g.fillRect(segX, offerY, segW, headerH);
        this.content.push(g);
        const label = this.domText.add(
          segX + segW / 2,
          offerY + headerH / 2,
          t(it.nameKey),
          { color: hexToCss(active ? PALETTE.bgVoid : PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true, clampLines: 1, wordWrapWidth: segW - 6 },
          0.5,
          0.5,
        );
        this.content.push(label);
        const zone = this.add.zone(segX + segW / 2, offerY + headerH / 2, segW, headerH).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          playSfx('uiClick');
          this.selectedByCategory.set('premium', it.id);
          this.renderCategory();
        });
        this.content.push(zone);
      });
    } else {
      const g = this.add.graphics();
      g.fillStyle(PALETTE.reward, 1);
      g.fillRect(offerX, offerY, offerW, headerH);
      this.content.push(g);
      const label = this.domText.add(
        offerX + offerW / 2,
        offerY + headerH / 2,
        t(selected.nameKey),
        { color: hexToCss(PALETTE.bgVoid), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true },
        0.5,
        0.5,
      );
      this.content.push(label);
    }

    const bodyG = this.add.graphics();
    bodyG.fillStyle(PALETTE.metalDark, 1);
    bodyG.lineStyle(2, PALETTE.reward, 1);
    bodyG.fillRect(offerX, offerY + headerH, offerW, 198 - headerH);
    bodyG.strokeRect(offerX, offerY, offerW, 198);
    this.content.push(bodyG);

    const features =
      selected.id === 'remove_ads'
        ? [t('shopNoAdsFeature1'), t('shopNoAdsFeature2'), t('shopNoAdsFeature3')]
        : [t('shopNoAds'), t('shopSkinError404'), t('shopFxDataWipe'), t('shopPackCorrupted')];

    features.forEach((line, i) => {
      const y = offerY + headerH + 14 + i * 20;
      const check = this.add.graphics();
      check.fillStyle(PALETTE.patrolVisor, 1);
      check.fillRect(offerX + 12, y, 10, 10);
      check.lineStyle(1.4, PALETTE.bgVoid, 1);
      check.beginPath();
      check.moveTo(offerX + 14, y + 5);
      check.lineTo(offerX + 16.5, y + 8);
      check.lineTo(offerX + 20, y + 2.5);
      check.strokePath();
      this.content.push(check);

      const text = this.domText.add(
        offerX + 28,
        y + 5,
        line,
        { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 10, wordWrapWidth: offerW - 40, clampLines: 1 },
        0,
        0.5,
      );
      this.content.push(text);
    });

    this.buildPremiumPurchasePanel(selected, offerY);

    const colW = this.scale.width - RIGHT_COL_X - 8;
    if (colW >= RIGHT_COL_MIN_W) {
      const sysBg = this.add.rectangle(RIGHT_COL_X, offerY, colW, 198, PALETTE.system, 0.12).setOrigin(0, 0);
      const sysEdge = this.add.rectangle(RIGHT_COL_X, offerY, 2, 198, PALETTE.system, 1).setOrigin(0, 0);
      this.content.push(sysBg, sysEdge);
      const label = this.domText.add(
        RIGHT_COL_X + 8,
        offerY + 16,
        '',
        { color: hexToCss(PALETTE.systemLight), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 10, wordWrapWidth: colW - 16, clampLines: 8 },
        0,
        0,
      );
      this.content.push({ destroy: () => label.destroy() });
      this.systemLineLabel = label;
    } else {
      this.systemLineLabel = null;
    }
  }

  /** Purchase panel amendments (owner, this round): no "ask an adult" copy, no "restore purchase" button (`PurchaseManager.restorePurchases()` already runs automatically at boot — a manual duplicate added nothing but visual noise) — the button centers in the freed vertical space instead of sitting at its old fixed offset. */
  private buildPremiumPurchasePanel(item: ShopItem, top: number): void {
    const x = DETAIL_X;
    const w = DETAIL_W;
    const h = 198;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.lineStyle(1, PALETTE.goldDim, 1);
    g.fillRect(x, top, w, h);
    g.strokeRect(x, top, w, h);
    this.content.push(g);

    const title = this.domText.add(
      x + w / 2,
      top + 16,
      t('shopOneTimePurchase'),
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0.5,
      0.5,
    );
    this.content.push(title);

    const realPrice = item.productId ? this.catalogPricesById.get(item.productId) : undefined;
    const priceText = realPrice ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
    // A real price ("99 ₽") is short by construction and reads as the hero
    // number; the "catalog unavailable"/loading fallback is a full sentence
    // that must never blow past the panel at the same giant size.
    const price = this.domText.add(
      x + w / 2,
      top + 40,
      priceText,
      realPrice
        ? { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), scale: 3, bold: true, wordWrapWidth: w - 16, clampLines: 1 }
        : { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), scale: 1, sizePx: 11, wordWrapWidth: w - 16, clampLines: 2 },
      0.5,
      0.5,
    );
    this.content.push(price);

    const dividerY = top + 66;
    const divider = this.add.rectangle(x + 12, dividerY, w - 24, 1, PALETTE.goldDim, 1).setOrigin(0, 0.5);
    this.content.push(divider);

    const owned = this.isOwned(item);
    if (owned) {
      const ownedLabel = this.domText.add(
        x + w / 2,
        (dividerY + top + h - 8) / 2,
        t('shopOwned'),
        { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), scale: 1, bold: true },
        0.5,
        0.5,
      );
      this.content.push(ownedLabel);
      return;
    }

    const btnH = 44;
    const regionTop = dividerY;
    const regionBottom = top + h - 8;
    const btnCy = regionTop + (regionBottom - regionTop) / 2;
    this.drawActionButton(x + w / 2, btnCy, w - 12, btnH, t('shopBuy'), PALETTE.reward, PALETTE.goldEdge, true, () => void this.handleBuy(item));
  }

  // ---- purchase flow (unchanged behavior from the tab-based shop) --------

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
      inv.isOwned('character', 'patrol') ||
      inv.isOwned('character', 'echo') ||
      inv.isOwned('death_fx', 'glitch') ||
      inv.isOwned('system', 'cold') ||
      inv.isOwned('trail', 'launch') ||
      inv.isOwned('trail', 'interference') ||
      inv.isOwned('trail', 'beep7')
    );
  }

  // ---- GET CREDITS sub-view (unchanged design, out of this round's scope) -

  private openGetCredits(): void {
    this.view = 'credits';
    this.setRailVisible(false);
    this.teardownLivePreview();
    this.clearContent();
    const { width } = this.scale;

    const title = this.domText.add(
      width / 2,
      44,
      t('shopGetCredits'),
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 2, bold: true },
      0.5,
      0.5,
    );
    this.content.push(title);

    const rowW = Math.min(320, width - 40);
    let y = 76;
    for (const pack of CREDIT_PACKS) {
      const price = this.catalogPricesById.get(pack.productId) ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
      this.drawTextRow(width / 2, y, rowW, `${pack.credits} CREDITS — ${price}`, () => void this.handleBuyCreditPack(pack.productId));
      y += 26;
    }

    if (!AdsService.isAdsDisabled()) {
      this.drawTextRow(width / 2, y + 6, rowW, `${t('shopWatchAd')} — ${EARN_AMOUNTS.rewardedAd} CREDITS`, () => {
        AdsService.requestRewarded((granted) => {
          if (granted) {
            CurrencyService.earnCredits(EARN_AMOUNTS.rewardedAd, 'rewarded_ad');
            this.refreshBalance();
          }
        });
      });
    }
  }

  private drawTextRow(cx: number, cy: number, w: number, text: string, onClick: () => void): void {
    const g = this.add.graphics();
    const domLabel = this.domText.add(
      cx,
      cy,
      text,
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
      0.5,
      0.5,
    );
    this.content.push(g, domLabel);
    const h = 20;

    const redraw = (hover: boolean): void => {
      g.clear();
      g.fillStyle(PALETTE.metalMid, hover ? 0.42 : 0.22);
      g.lineStyle(1, hover ? PALETTE.cyan : PALETTE.cyanDim, 1);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
      domLabel.setColor(hexToCss(hover ? PALETTE.white : PALETTE.cyan));
    };
    redraw(false);

    const zone = this.add.zone(cx, cy, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => redraw(true));
    zone.on('pointerout', () => redraw(false));
    zone.on('pointerup', () => {
      playSfx('uiClick');
      onClick();
    });
    this.content.push(zone);
  }

  private backToMain(): void {
    this.view = 'main';
    this.setRailVisible(true);
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
