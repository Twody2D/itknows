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
import type { ShopCategory, ShopItem, ShopRarity } from '@/data/shop/items';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { commentOnShop } from '@/data/dialogues/shop';
import type { ShopCommentKind } from '@/data/dialogues/shop';
import { playerTexturePrefix, skinColorsFor } from '@/data/shop/skinVisuals';
import { PHYSICS } from '@/config/physics';
import { TrailFx } from '@/gameplay/TrailFx';
import type { TrailKind } from '@/gameplay/TrailFx';
import { FxManager } from '@/fx/FxManager';
import { PACKS } from '@/data/dialogues';

// Rail order top-to-bottom, per the Claude Design showroom mockup — БЕЗ РЕК.
// sits at the bottom as the one solid gold shape in the rail, which is what
// separates the paid tab from the free ones visually instead of by position.
const CATEGORIES: ShopCategory[] = ['character', 'trail', 'death_fx', 'system', 'premium'];
const CATEGORY_LABEL: Record<ShopCategory, UiStringKey> = {
  character: 'shopCategoryCharacter',
  trail: 'shopCategoryTrail',
  death_fx: 'shopCategoryDeathFx',
  system: 'shopCategorySystem',
  premium: 'shopCategoryPremium',
};
/** Each category's identity color — rail active state, panel border, equip-button accent. Money stays gold in every category (see `PALETTE.reward`'s own note). */
const CATEGORY_ACCENT: Record<ShopCategory, number> = {
  character: PALETTE.cyan,
  trail: PALETTE.cyan,
  death_fx: PALETTE.dangerAlt,
  system: PALETTE.system,
  premium: PALETTE.reward,
};
/** The darker step of each accent, used for a button's sole and a panel's dim border. */
const CATEGORY_SOLE: Record<ShopCategory, number> = {
  character: PALETTE.cyanDim,
  trail: PALETTE.cyanDim,
  death_fx: PALETTE.goldSole,
  system: PALETTE.systemDim,
  premium: PALETTE.goldSole,
};
const CATEGORY_COMMENT: Record<ShopCategory, ShopCommentKind> = {
  character: 'browse_character',
  trail: 'browse_trail',
  death_fx: 'browse_death_fx',
  system: 'browse_system',
  premium: 'browse_premium',
};
const RARITY_LABEL: Record<ShopRarity, UiStringKey> = {
  common: 'shopRarityCommon',
  rare: 'shopRarityRare',
  premium: 'shopRarityPremium',
};
const RARITY_COLOR: Record<ShopRarity, number> = {
  common: PALETTE.labelMuted,
  rare: PALETTE.patrolVisor,
  premium: PALETTE.echoVisor,
};
/** `ShopItem.category` values that map onto an `InventoryService` equip slot — `premium` products are owned-only, never equipped. */
const INVENTORY_CATEGORY: Partial<Record<ShopCategory, InventoryCategory>> = {
  character: 'character',
  death_fx: 'death_fx',
  system: 'system',
  trail: 'trail',
};

// Layout — virtual px on the fixed 270px-tall canvas (width floats 480..620).
const TOPBAR_H = 28;
const RAIL_W = 64;
const GRID_X = 70;
const DETAIL_X = 330;
const DETAIL_W = 146;
const DETAIL_TOP = 32;
const DETAIL_H = 206;
const PREVIEW_TOP = 56;
const BTN_X = DETAIL_X + 6;
const BTN_W = DETAIL_W - 12;
const BTN_TOP = 196;
const BTN_H = 36;
const RIGHT_COL_X = 492;
const RIGHT_COL_MIN_W = 80;
const DEATH_PREVIEW_INTERVAL_MS = 1600;
/**
 * The test run hops often and lands hard on purpose: LAUNCH only emits on a
 * jump and INTERFERENCE only above a real falling speed, so a lazy loop would
 * leave two of the four trails looking like they do nothing. The run itself
 * uses the real `PHYSICS.moveSpeed` — that is what sets how far apart a
 * trail's particles land — while the hop is scaled down to fit a 64px stage.
 */
const TRAIL_JUMP_INTERVAL_MS = 800;
const TRAIL_JUMP_SPEED = 300;
const TRAIL_GRAVITY = 2000;
const TRAIL_RUN_SPEED = PHYSICS.moveSpeed;
const TRAIL_SPRITE_SCALE = 0.7;
/**
 * The floor sits inside the stage rather than on its bottom edge, and the
 * runner is drawn small, because the four trails emit in opposite directions:
 * LAUNCH fires its exhaust *downward* (it is thrust, same as in game) and
 * needs room under the feet, while INTERFERENCE draws its scan lines a full
 * sprite-height *above* the feet and needs room over the head.
 */
const TRAIL_FLOOR_OFFSET = 46;

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

/** Live "test run" state for the trail preview — a real run/jump/fall cycle so every trail kind actually reaches its own spawn condition (`TrailFx` only emits above a speed/fall threshold). */
interface TrailPreview {
  fx: TrailFx;
  sprite: Phaser.GameObjects.Sprite | null;
  prefix: string;
  anim: 'run' | 'jump' | 'fall';
  x: number;
  y: number;
  vx: number;
  vy: number;
  flipX: boolean;
  groundY: number;
  leftX: number;
  rightX: number;
  onGround: boolean;
  nextJumpAtMs: number;
}

/**
 * "SYSTEM ARCHIVE" — master-prompt §13, rebuilt as a full-bleed showroom
 * (Claude Design mockups 3a/3b/4a/4b/4c): a vertical category rail, a card
 * grid where every card shows the actual product, and a fixed fitting-room
 * panel with a live preview — the same three-zone frame for all five
 * categories, with `premium` swapping the grid for its single offer.
 *
 * Text renders through `DomTextOverlay` (real browser text, project owner's
 * call). Every interactive shape is hand-drawn `Graphics` + `Zone`, not
 * `PixelButton`/`MenuTile` — both are hardcoded to one cyan accent and can't
 * take this screen's gold/orange/purple palette.
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
  private systemLineLabel: DomTextHandle | null = null;
  private systemLineText = '';

  private trailPreview: TrailPreview | null = null;
  private previewFx: FxManager | null = null;
  private deathPreviewTimer: Phaser.Time.TimerEvent | null = null;
  private replayDeathPreview: (() => void) | null = null;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // The scene instance is reused every time the player reopens the shop
    // (`MainMenuScene.openOverlay` calls `scene.launch` again), so anything
    // holding Graphics/Zones from a previous run has to be dropped here —
    // those objects were destroyed by that run's shutdown.
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
    });

    void this.loadCatalog();
    this.renderCategory();
    commentOnShop('open');
  }

  override update(_time: number, delta: number): void {
    if (this.trailPreview) this.stepTrailPreview(delta);
  }

  // ---- topbar ----------------------------------------------------------

  private buildTopbar(width: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.bgIndigo, 1);
    bg.fillRect(0, 0, width, TOPBAR_H);
    bg.fillStyle(PALETTE.cyanDim, 1);
    bg.fillRect(0, TOPBAR_H - 1, width, 1);

    const chev = this.add.graphics();
    chev.fillStyle(PALETTE.metalMid, 1);
    chev.lineStyle(1, PALETTE.metalEdge, 1);
    chev.fillRect(8, 4, 20, 20);
    chev.strokeRect(8, 4, 20, 20);
    chev.lineStyle(2, PALETTE.cyan, 1);
    chev.beginPath();
    chev.moveTo(21, 9);
    chev.lineTo(15, 14);
    chev.lineTo(21, 19);
    chev.strokePath();
    const chevronZone = this.add.zone(18, 14, 32, 28).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    chevronZone.on('pointerup', () => {
      playSfx('uiClick');
      if (this.view === 'main') this.scene.stop();
      else this.backToMain();
    });

    this.domText.add(
      36,
      14,
      t('shop'),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), sizePx: 17, bold: true, uppercase: true },
      0,
      0.5,
    );

    const walletW = 116;
    const walletX = width - 8 - walletW;
    if (walletX >= 150) {
      this.domText.add(
        142,
        15,
        t('shopTitle'),
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9 },
        0,
        0.5,
      );
    }

    const wallet = this.add.graphics();
    wallet.fillStyle(PALETTE.metalDark, 1);
    wallet.lineStyle(1, PALETTE.goldDim, 1);
    wallet.fillRect(walletX, 4, walletW, 20);
    wallet.strokeRect(walletX, 4, walletW, 20);
    this.drawCoin(wallet, walletX + 14, 14, 5, false);
    wallet.fillStyle(PALETTE.goldDim, 1);
    wallet.fillRect(walletX + walletW - 20, 8, 13, 13);
    wallet.fillStyle(PALETTE.reward, 1);
    wallet.fillRect(walletX + walletW - 15, 11, 3, 7);
    wallet.fillRect(walletX + walletW - 17, 13, 7, 3);

    this.walletLabel = this.domText.add(
      walletX + 24,
      14,
      this.balanceText(),
      { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), sizePx: 14, bold: true },
      0,
      0.5,
    );

    const walletZone = this.add.zone(walletX + walletW / 2, 14, walletW, 20).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    walletZone.on('pointerup', () => {
      playSfx('uiClick');
      if (this.view === 'main') this.openGetCredits();
    });
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

  // ---- small shared painters ------------------------------------------

  private drawCoin(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, dim: boolean): void {
    g.fillStyle(dim ? PALETTE.goldDim : PALETTE.reward, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(1, dim ? PALETTE.goldSole : PALETTE.goldEdge, 1);
    g.strokeCircle(cx, cy, r);
  }

  private drawCheck(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number): void {
    g.lineStyle(1.8, color, 1);
    g.beginPath();
    g.moveTo(cx - size, cy);
    g.lineTo(cx - size * 0.25, cy + size * 0.75);
    g.lineTo(cx + size, cy - size * 0.8);
    g.strokePath();
  }

  private drawLockGlyph(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    g.fillStyle(PALETTE.metalEdge, 1);
    g.fillRect(cx - 12, cy - 2, 24, 19);
    g.lineStyle(3, PALETTE.metalEdge, 1);
    g.strokeRect(cx - 6, cy - 15, 12, 13);
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(cx - 2, cy + 3, 4, 7);
  }

  // ---- rail --------------------------------------------------------------

  /** Category glyphs per the mockup's own geometry notes — БЕЗ РЕК. is the one solid gold diamond, so the paid tab reads as different at a glance. */
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
        g.fillStyle(color, 1);
        g.fillRect(cx - 4, cy - 8, 8, 6);
        g.fillRect(cx - 6, cy - 1, 12, 8);
        g.fillRect(cx - 5, cy + 8, 3, 3);
        g.fillRect(cx + 2, cy + 8, 3, 3);
        break;
      case 'trail':
        g.fillStyle(color, 0.4);
        g.fillRect(cx - 9, cy + 3, 3, 3);
        g.fillStyle(color, 0.7);
        g.fillRect(cx - 3, cy - 1, 4, 4);
        g.fillStyle(color, 1);
        g.fillRect(cx + 4, cy - 6, 6, 6);
        break;
      case 'death_fx':
        g.fillStyle(color, 1);
        g.fillRect(cx - 7, cy - 6, 4, 4);
        g.fillRect(cx + 3, cy - 4, 4, 4);
        g.fillRect(cx - 2, cy + 1, 4, 4);
        g.fillStyle(color, 0.5);
        g.fillRect(cx - 8, cy + 5, 3, 3);
        g.fillRect(cx + 4, cy + 6, 3, 3);
        break;
      case 'system':
        g.lineStyle(2, color, 1);
        g.strokeRect(cx - 8, cy - 8, 16, 16);
        g.fillStyle(color, 1);
        g.fillRect(cx - 3, cy - 3, 6, 6);
        break;
    }
  }

  private buildRail(): void {
    const { height } = this.scale;
    const rowH = 44;
    const gap = 2;
    let y = TOPBAR_H + 4;

    const railBg = this.add.graphics();
    railBg.fillStyle(PALETTE.metalDark, 1);
    railBg.fillRect(0, TOPBAR_H, RAIL_W, height - TOPBAR_H);
    railBg.fillStyle(PALETTE.metalMid, 1);
    railBg.fillRect(RAIL_W - 1, TOPBAR_H, 1, height - TOPBAR_H);

    CATEGORIES.forEach((category, i) => {
      const isLast = i === CATEGORIES.length - 1;
      const rowTop = y;
      const rowHeight = isLast ? height - rowTop - 4 : rowH;
      const cy = rowTop + rowHeight / 2;

      const bg = this.add.graphics();
      const icon = this.add.graphics();
      const label = this.domText.add(
        RAIL_W / 2,
        rowTop + rowHeight - 10,
        t(CATEGORY_LABEL[category]),
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
        0.5,
        0.5,
      );

      const zone = this.add
        .zone(RAIL_W / 2, cy, RAIL_W, rowHeight)
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
        rail.bg.fillStyle(accent, 0.14);
        rail.bg.fillRect(0, rail.top, RAIL_W, rail.h);
        rail.bg.fillStyle(accent, 1);
        rail.bg.fillRect(0, rail.top, 3, rail.h);
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
    commentOnShop(CATEGORY_COMMENT[this.currentCategory()]);
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
   * A `campaign_complete` item has no price and no productId — it was never
   * meant to be bought once its condition is met. Granting it the moment the
   * shop notices keeps the UI in a real state (a "НАДЕТЬ" button) instead of
   * a dead "КУПИТЬ" that `handleBuy` would no-op on. Idempotent.
   */
  private syncProgressUnlocks(): void {
    for (const item of SHOP_ITEMS) {
      if (item.unlockCondition?.kind !== 'campaign_complete') continue;
      if (!this.isUnlocked(item) || this.isOwned(item)) continue;
      const slot = INVENTORY_CATEGORY[item.category];
      if (slot) InventoryService.unlock(slot, item.id);
    }
  }

  /** Bundle-exclusive cosmetics show once owned; a `campaign_complete` item always shows, locked or not, as its own "???" goal card (master-prompt §28 — a real goal may be displayed, a fake purchase may not). */
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

  private isEquipped(item: ShopItem): boolean {
    const slot = INVENTORY_CATEGORY[item.category];
    return slot ? InventoryService.getEquipped(slot) === item.id : false;
  }

  // ---- render pipeline -------------------------------------------------

  private clearContent(): void {
    for (const item of this.content) item.destroy();
    this.content = [];
  }

  private teardownLivePreview(): void {
    this.trailPreview?.fx.destroy();
    this.trailPreview = null;
    this.replayDeathPreview = null;
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

  // ---- cosmetic categories ---------------------------------------------

  private renderCosmeticShowroom(category: ShopCategory): void {
    const items = this.visibleItems(category);
    if (!this.selectedByCategory.has(category)) this.selectedByCategory.set(category, items[0]!.id);
    const selected = this.selectedItem(category);

    const owned = items.filter((item) => this.isOwned(item)).length;
    const header = this.domText.add(
      GRID_X,
      31,
      `${t(CATEGORY_LABEL[category])} · ${owned} ${t('shopOf')} ${items.length} ${t('shopUnlockedSuffix')}`,
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9 },
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
    // `character` can grow past 6 items (ERROR 404 from the SYSTEM ACCESS
    // bundle plus the campaign-locked CORE) — shrink the row instead of
    // letting a third row run off the fixed 270px canvas.
    const cardH = Math.min(92, Math.floor((this.scale.height - gridTop - 6 - (rows - 1) * gapY) / rows));

    items.forEach((item, i) => {
      const x = GRID_X + (i % cols) * (cardW + gapX);
      const y = gridTop + Math.floor(i / cols) * (cardH + gapY);
      this.buildCard(item, x, y, cardW, cardH, category, item.id === selected.id);
    });

    this.buildDetailPanel(category, selected);
    this.buildRightColumn(category, items);
  }

  // ---- cards ------------------------------------------------------------

  private buildCard(
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
    const equipped = owned && this.isEquipped(item);
    const affordable = item.priceCredits === undefined || CurrencyService.canAfford(item.priceCredits);
    const accent = CATEGORY_ACCENT[category];
    const plateH = 28;
    const previewH = h - plateH;
    const centered = category === 'character';

    const g = this.add.graphics();
    this.content.push(g);

    // Preview well — a shade darker than the card, lightened when the item is
    // out of reach so the silhouette still reads (mockup: never alpha the art).
    g.fillStyle(!unlocked || affordable ? PALETTE.bgVoid : PALETTE.metalDark, 1);
    g.fillRect(x, y, w, previewH);
    g.fillStyle(equipped ? PALETTE.panelHover : owned || affordable ? PALETTE.metalMid : PALETTE.bgGraphite, 1);
    g.fillRect(x, y + previewH, w, plateH);
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(x, y + previewH, w, 1);

    if (unlocked) this.drawCardArt(category, item, x, y, w, previewH, affordable || owned);
    else this.drawLockGlyph(g, x + w / 2, y + previewH / 2);

    // Border last so the art never paints over it.
    const border = this.add.graphics();
    this.content.push(border);
    if (equipped) {
      border.lineStyle(1, accent, 0.25);
      border.strokeRect(x - 2, y - 2, w + 4, h + 4);
      border.lineStyle(2, accent, 1);
      border.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else if (isSelected) {
      border.lineStyle(2, PALETTE.white, 1);
      border.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else {
      const color = !unlocked ? PALETTE.metalMid : owned ? PALETTE.metalEdge : affordable ? PALETTE.goldDim : PALETTE.metalMid;
      border.lineStyle(1, color, 1);
      border.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Rarity flag for the top tier, top-left of the well (mockup's "ТОП" tab).
    if (unlocked && item.rarity === 'premium') {
      const flag = this.add.graphics();
      flag.fillStyle(PALETTE.echoVisor, 1);
      flag.fillRect(x + 1, y + 1, 24, 10);
      this.content.push(flag);
      const flagLabel = this.domText.add(
        x + 13,
        y + 6,
        t('shopRarityPremium'),
        { color: hexToCss(PALETTE.bgVoid), strokeColor: hexToCss(PALETTE.outline), sizePx: 8, bold: true },
        0.5,
        0.5,
      );
      this.content.push(flagLabel);
    }

    const labelX = centered ? x + w / 2 : x + 8;
    const labelOrigin = centered ? 0.5 : 0;
    const name = this.domText.add(
      labelX,
      y + previewH + 9,
      unlocked ? t(item.nameKey) : t('shopLockedName'),
      {
        color: hexToCss(unlocked ? (equipped ? PALETTE.white : PALETTE.white) : PALETTE.labelMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: centered ? 10 : 11,
        bold: true,
      },
      labelOrigin,
      0.5,
    );
    this.content.push(name);

    const stateY = y + previewH + 21;
    if (!unlocked) {
      const cond = this.domText.add(
        labelX,
        stateY,
        t('shopLockedCondition'),
        { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), sizePx: 9 },
        labelOrigin,
        0.5,
      );
      this.content.push(cond);
    } else if (equipped || owned) {
      const state = this.domText.add(
        labelX,
        stateY,
        equipped ? t('shopEquipped') : t('shopOwned'),
        {
          color: hexToCss(equipped ? accent : PALETTE.labelMuted),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 9,
          uppercase: true,
        },
        labelOrigin,
        0.5,
      );
      this.content.push(state);
    } else if (item.priceCredits !== undefined) {
      // Coin + number, the same money shape the wallet uses — never a bare
      // "150 CR" string (mockup: price always reads as currency).
      const coin = this.add.graphics();
      const coinX = centered ? x + w / 2 - 14 : x + 12;
      this.drawCoin(coin, coinX, stateY, 4, !affordable);
      this.content.push(coin);
      const price = this.domText.add(
        coinX + 8,
        stateY,
        String(item.priceCredits),
        {
          color: hexToCss(affordable ? PALETTE.reward : PALETTE.goldSole),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 12,
          bold: true,
        },
        0,
        0.5,
      );
      this.content.push(price);
    }

    if (equipped) {
      const badge = this.add.graphics();
      badge.fillStyle(accent, 1);
      badge.fillRect(x + w - 12, y - 4, 16, 16);
      this.drawCheck(badge, x + w - 4, y + 4, 4, PALETTE.bgVoid);
      this.content.push(badge);
    }

    if (unlocked) {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        this.selectedByCategory.set(category, item.id);
        this.renderCategory();
      });
      this.content.push(zone);
    }
  }

  /** Card art: a real mini-scene per category, so two items in the same category never look alike. */
  private drawCardArt(
    category: ShopCategory,
    item: ShopItem,
    x: number,
    y: number,
    w: number,
    h: number,
    litColors: boolean,
  ): void {
    const g = this.add.graphics();
    this.content.push(g);
    const cx = x + w / 2;
    const groundY = y + h - 4;

    if (category === 'character') {
      this.addSprite(item.id, cx, y + h - 2, 1.45, litColors ? undefined : PALETTE.textDisabled);
      return;
    }

    if (category === 'system') {
      this.drawSystemCardArt(g, item, x, y, w, h);
      return;
    }

    // trail / death_fx share the same "character on a floor strip" staging.
    const equippedSkin = InventoryService.getEquipped('character');
    const spriteX = category === 'trail' ? x + w - 30 : x + 26;
    g.fillStyle(CATEGORY_ACCENT[category], 0.16);
    g.fillRect(x, groundY, w, 4);

    if (category === 'trail') {
      this.drawTrailCardArt(g, item.id as TrailKind, x, y, h, spriteX, groundY);
      this.addSprite(equippedSkin, spriteX, groundY, 0.9, litColors ? undefined : PALETTE.textDisabled);
      return;
    }

    this.drawDeathCardArt(g, item.id, x, y, w, h, spriteX, groundY);
  }

  private drawTrailCardArt(
    g: Phaser.GameObjects.Graphics,
    kind: TrailKind,
    x: number,
    y: number,
    h: number,
    spriteX: number,
    groundY: number,
  ): void {
    switch (kind) {
      case 'data_trail': {
        // The real `data_trail` colors: cyan fading to cyanDim, 2px squares.
        const shades = [PALETTE.cyanDim, PALETTE.cyanDim, PALETTE.cyanSoleHover, PALETTE.cyan];
        shades.forEach((color, i) => {
          g.fillStyle(color, 0.5 + i * 0.16);
          g.fillRect(x + 10 + i * 14, groundY - 12 - (i % 2) * 6, 4, 4);
        });
        break;
      }
      case 'launch': {
        g.fillStyle(PALETTE.reward, 1);
        g.fillRect(spriteX - 3, groundY - 6, 6, 6);
        g.fillStyle(PALETTE.dangerAlt, 1);
        g.fillRect(spriteX - 16, groundY - 10, 5, 5);
        g.fillRect(spriteX + 12, groundY - 8, 5, 5);
        g.fillStyle(PALETTE.reward, 0.7);
        g.fillRect(spriteX - 26, groundY - 4, 3, 3);
        g.fillRect(spriteX + 22, groundY - 2, 3, 3);
        break;
      }
      case 'interference': {
        // The real streaks: white / metalEdge 1px scan lines above the body.
        const rows = [0, 8, 16, 24];
        rows.forEach((dy, i) => {
          g.fillStyle(i % 2 === 0 ? PALETTE.white : PALETTE.metalEdge, 0.9 - i * 0.18);
          g.fillRect(spriteX - 22 + (i % 2) * 6, y + 8 + dy, 24 - i * 3, 2);
        });
        break;
      }
      case 'beep7': {
        g.fillStyle(PALETTE.metalEdge, 1);
        g.fillRect(x + 16, y + 16, 16, 6);
        g.fillStyle(PALETTE.system, 1);
        g.fillRect(x + 22, y + 22, 4, 4);
        g.fillStyle(PALETTE.system, 0.5);
        g.fillRect(x + 23, y + 30, 2, 2);
        g.fillStyle(PALETTE.system, 0.25);
        g.fillRect(x + 23, y + 36, 2, 2);
        break;
      }
    }
    void h;
  }

  private drawDeathCardArt(
    g: Phaser.GameObjects.Graphics,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    spriteX: number,
    groundY: number,
  ): void {
    // Every variant draws with the colors its real effect uses
    // (`FxManager.deathBurst`): white/danger fragments, cyan glitch slices,
    // and the wider white wipe for the bundle-exclusive DATA WIPE.
    this.addSprite(InventoryService.getEquipped('character'), spriteX, groundY, 0.9, PALETTE.textDisabled);

    if (id === 'static') {
      const bits: [number, number, number][] = [
        [26, -34, 5],
        [44, -22, 4],
        [60, -38, 4],
        [38, -12, 4],
        [58, -8, 3],
        [72, -26, 3],
      ];
      for (const [dx, dy, size] of bits) {
        g.fillStyle(size >= 4 ? PALETTE.white : PALETTE.danger, 1);
        g.fillRect(x + dx, groundY + dy, size, size);
      }
      return;
    }

    if (id === 'glitch') {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(PALETTE.cyan, 0.85 - i * 0.18);
        g.fillRect(x + 12 + (i % 2) * 10, y + 10 + i * 10, w - 30, 2);
      }
      g.fillStyle(PALETTE.danger, 0.9);
      g.fillRect(spriteX - 10, groundY - 20, 4, 4);
      return;
    }

    // data_wipe — the widest, brightest pass, the way the real variant reads.
    for (let i = 0; i < 5; i++) {
      g.fillStyle(PALETTE.white, 0.9 - i * 0.16);
      g.fillRect(x + 6, y + 8 + i * 9, w - 12 - i * 8, 3);
    }
    g.fillStyle(PALETTE.white, 1);
    g.fillRect(x + 6, groundY - 6, w - 12, 2);
    void h;
  }

  private drawSystemCardArt(
    g: Phaser.GameObjects.Graphics,
    item: ShopItem,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const lines = this.packLines(item.id);
    const accent = lines.length > 0 ? (item.id === 'cold' ? PALETTE.cyan : PALETTE.system) : PALETTE.metalEdge;

    g.fillStyle(accent, 1);
    g.fillRect(x + 8, y + 8, 2, h - 16);

    if (lines.length === 0) {
      // No pack lines wired up yet (`corrupted`) — three dim beats instead of
      // inventing dialogue for a tone that does not exist yet.
      for (let i = 0; i < 3; i++) {
        g.fillStyle(PALETTE.metalEdge, 1);
        g.fillRect(x + 16 + i * 8, y + h / 2 - 2, 4, 4);
      }
      return;
    }

    const quote = this.domText.add(
      x + 15,
      y + 10,
      lines[0]!.ru.toUpperCase(),
      {
        color: hexToCss(item.id === 'cold' ? PALETTE.cyanBright : PALETTE.systemLight),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        wordWrapWidth: w - 24,
        clampLines: 3,
      },
      0,
      0,
    );
    this.content.push(quote);

    // Voice-meter bars, bottom-right — the mockup's own "someone is talking" cue.
    const bars = item.id === 'cold' ? [4, 4, 4] : [5, 9, 4, 11];
    bars.forEach((barH, i) => {
      g.fillStyle(accent, 1);
      g.fillRect(x + w - 8 - (bars.length - i) * 4, y + h - 6 - barH, 2, barH);
    });
  }

  private addSprite(skinId: string, x: number, y: number, scale: number, tint?: number): Phaser.GameObjects.Sprite | null {
    const prefix = playerTexturePrefix(skinId);
    if (!this.textures.exists(`${prefix}-idle-0`)) return null;
    const sprite = this.add.sprite(x, y, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(scale);
    if (tint !== undefined) sprite.setTint(tint);
    this.content.push(sprite);
    return sprite;
  }

  /**
   * The pack's three shortest real lines, across all of its situations. A
   * quote row is 130px of 9px text — roughly twenty characters — and a line
   * cut off as "ПОЛ БЫЛ ВОН ТАМ,…" sells a tone worse than a short one that
   * lands whole. Picking by length rather than by a fixed situation also
   * keeps two packs from previewing identically, which is what happened when
   * this took `general[0]` from each (both open with the same word).
   */
  private packLines(packId: string): { ru: string; en: string }[] {
    const pool = (PACKS as Record<string, (typeof PACKS)['standard'] | undefined>)[packId];
    if (!pool) return [];
    const seen = new Set<string>();
    return Object.values(pool)
      .flat()
      .filter((line) => {
        if (seen.has(line.ru)) return false;
        seen.add(line.ru);
        return true;
      })
      .sort((a, b) => a.ru.length - b.ru.length)
      .slice(0, 3);
  }

  // ---- fitting-room panel ------------------------------------------------

  private detailFrame(border: number, headerText: string, headerColor: number): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.fillRect(DETAIL_X, DETAIL_TOP, DETAIL_W, DETAIL_H);
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(DETAIL_X, DETAIL_TOP, DETAIL_W, 18);
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(DETAIL_X, DETAIL_TOP + 18, DETAIL_W, 1);
    g.lineStyle(1, border, 1);
    g.strokeRect(DETAIL_X + 0.5, DETAIL_TOP + 0.5, DETAIL_W - 1, DETAIL_H - 1);
    this.content.push(g);

    const header = this.domText.add(
      DETAIL_X + DETAIL_W / 2,
      DETAIL_TOP + 9,
      headerText,
      { color: hexToCss(headerColor), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
      0.5,
      0.5,
    );
    this.content.push(header);
  }

  private buildDetailPanel(category: ShopCategory, item: ShopItem): void {
    const accent = CATEGORY_ACCENT[category];
    const unlocked = this.isUnlocked(item);

    if (category === 'character') {
      this.detailFrame(PALETTE.cyanDim, t('shopFittingRoom'), PALETTE.cyan);
      this.buildCharacterScene(item, unlocked);
      this.buildLegend(item, 156);
    } else {
      if (category === 'trail') {
        this.detailFrame(PALETTE.cyanDim, t('shopTrialRun'), PALETTE.cyan);
        this.buildTrailScene(item);
      } else if (category === 'death_fx') {
        this.detailFrame(PALETTE.goldSole, t('shopDeathPreview'), PALETTE.dangerAlt);
        this.buildDeathScene(item, unlocked);
      } else {
        this.detailFrame(PALETTE.systemDim, t('shopSystemSample'), PALETTE.system);
        this.buildSystemScene(item);
      }
      // One rhythm for all three: the stage ends at 120 (SYSTEM's third quote
      // row at 124), the name sits clear of it, and the legend's two lines
      // stop just above the status row at 180.
      this.buildNameRow(item, 132);
      this.buildLegend(item, 150);
    }

    this.buildStatusRow(category, item, unlocked);
    this.buildDetailButton(category, item, unlocked, accent);
  }

  /** Name + rarity badge on one line — the layout every non-character panel uses (the character panel puts them in its own right-hand column instead). */
  private buildNameRow(item: ShopItem, y: number): void {
    const name = this.domText.add(
      DETAIL_X + 8,
      y,
      t(item.nameKey),
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), sizePx: 12, bold: true },
      0,
      0.5,
    );
    this.content.push(name);
    this.buildRarityBadge(item, DETAIL_X + DETAIL_W - 8, y, 1);
  }

  private buildRarityBadge(item: ShopItem, x: number, y: number, originX: number): void {
    const rarity = item.rarity ?? 'common';
    const color = RARITY_COLOR[rarity];
    const label = t(RARITY_LABEL[rarity]);
    const w = label.length * 5 + 8;
    const boxX = originX === 1 ? x - w : x;

    const g = this.add.graphics();
    g.fillStyle(color, 0.16);
    g.fillRect(boxX, y - 6, w, 12);
    g.lineStyle(1, color, 1);
    g.strokeRect(boxX + 0.5, y - 5.5, w - 1, 11);
    this.content.push(g);

    const text = this.domText.add(
      boxX + w / 2,
      y,
      label,
      { color: hexToCss(color), strokeColor: hexToCss(PALETTE.outline), sizePx: 8, bold: true },
      0.5,
      0.5,
    );
    this.content.push(text);
  }

  private buildLegend(item: ShopItem, y: number): void {
    const legend = this.domText.add(
      DETAIL_X + 8,
      y,
      t(item.descriptionKey),
      {
        color: hexToCss(PALETTE.textMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        wordWrapWidth: DETAIL_W - 16,
        clampLines: 2,
      },
      0,
      0,
    );
    this.content.push(legend);
  }

  /** The row above the button: what the purchase costs you on the left, the price (or a live action) on the right. */
  private buildStatusRow(category: ShopCategory, item: ShopItem, unlocked: boolean): void {
    const y = 180;
    const leftX = DETAIL_X + 8;
    const rightX = DETAIL_X + DETAIL_W - 8;
    const owned = unlocked && this.isOwned(item);
    const equipped = owned && this.isEquipped(item);
    const price = item.priceCredits;
    const balance = CurrencyService.getBalance();

    if (!unlocked) {
      const cond = this.domText.add(
        leftX,
        y,
        t('shopLockedCondition'),
        { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
        0,
        0.5,
      );
      this.content.push(cond);
      return;
    }

    if (owned) {
      const left = this.domText.add(
        leftX,
        y,
        equipped ? t('shopWorn') : t('shopOwned'),
        { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, uppercase: true },
        0,
        0.5,
      );
      this.content.push(left);

      // "ЕЩЁ РАЗ" replays the death effect on demand — the one secondary
      // action in this row that maps onto something the preview really does.
      if (category === 'death_fx' && this.replayDeathPreview) {
        const replay = this.domText.add(
          rightX,
          y,
          t('shopReplay'),
          { color: hexToCss(PALETTE.dangerAlt), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
          1,
          0.5,
        );
        this.content.push(replay);
        const zone = this.add.zone(rightX - 24, y, 56, 14).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          playSfx('uiClick');
          this.replayDeathPreview?.();
        });
        this.content.push(zone);
      }
      return;
    }

    if (price === undefined) return;

    const affordable = balance >= price;
    const left = this.domText.add(
      leftX,
      y,
      affordable ? `${t('shopWillRemain')} ${balance - price}` : `${t('shopNotEnough')} ${price - balance}`,
      {
        color: hexToCss(affordable ? PALETTE.labelMuted : PALETTE.dangerAlt),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
      },
      0,
      0.5,
    );
    this.content.push(left);

    const priceText = this.domText.add(
      rightX,
      y,
      String(price),
      {
        color: hexToCss(affordable ? PALETTE.reward : PALETTE.goldSole),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 14,
        bold: true,
      },
      1,
      0.5,
    );
    this.content.push(priceText);
    const coin = this.add.graphics();
    this.drawCoin(coin, rightX - priceText.width - 8, y, 5, !affordable);
    this.content.push(coin);
  }

  private buildDetailButton(category: ShopCategory, item: ShopItem, unlocked: boolean, accent: number): void {
    if (!unlocked) return;
    const owned = this.isOwned(item);
    const equipped = owned && this.isEquipped(item);
    const slot = INVENTORY_CATEGORY[item.category];

    if (equipped) {
      this.drawShowroomButton({
        label: t('shopEquipped'),
        style: 'accent',
        accent,
        sole: CATEGORY_SOLE[category],
        icon: 'check',
        interactive: false,
      });
      return;
    }

    if (owned) {
      this.drawShowroomButton({
        label: t('shopEquip'),
        style: 'accent',
        accent,
        sole: CATEGORY_SOLE[category],
        icon: 'check',
        interactive: true,
        onClick: () => {
          if (!slot) return;
          InventoryService.equip(slot, item.id);
          this.renderCategory();
        },
      });
      return;
    }

    if (item.priceCredits === undefined && !item.productId) return;

    const affordable = item.priceCredits === undefined || CurrencyService.canAfford(item.priceCredits);
    if (affordable) {
      this.drawShowroomButton({
        label: t('shopBuy'),
        style: 'gold',
        accent: PALETTE.reward,
        sole: PALETTE.goldSole,
        icon: 'coin',
        interactive: true,
        onClick: () => void this.handleBuy(item),
      });
      return;
    }

    // Out of reach: the button turns into the one real way forward — a
    // voluntary rewarded ad — instead of a dead "buy" the player can't use.
    if (!AdsService.isAdsDisabled()) {
      this.drawShowroomButton({
        label: `${t('shopSignalShort')} +${EARN_AMOUNTS.rewardedAd}`,
        style: 'accent',
        accent: PALETTE.cyan,
        sole: PALETTE.cyanDim,
        icon: 'none',
        interactive: true,
        onClick: () => {
          AdsService.requestRewarded((granted) => {
            if (!granted) return;
            CurrencyService.earnCredits(EARN_AMOUNTS.rewardedAd, 'rewarded_ad');
            this.refreshBalance();
            this.renderCategory();
          });
        },
      });
      return;
    }

    this.drawShowroomButton({
      label: t('shopNotEnough'),
      style: 'muted',
      accent: PALETTE.metalEdge,
      sole: PALETTE.metalDark,
      icon: 'none',
      interactive: false,
    });
  }

  /**
   * The showroom's one button shape: a lit face standing on a 4px sole that
   * disappears when pressed (the face drops onto it), exactly like the
   * mockup's `box-shadow: 0 4px 0`. `gold` is the money button (gradient face,
   * white rim, dark text); `accent` is the category-colored equip button
   * (dark face, colored rim and icon, white text).
   */
  private drawShowroomButton(opts: {
    label: string;
    style: 'gold' | 'accent' | 'muted';
    accent: number;
    sole: number;
    icon: 'coin' | 'check' | 'none';
    interactive: boolean;
    onClick?: () => void;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }): void {
    const x = opts.x ?? BTN_X;
    const y = opts.y ?? BTN_TOP;
    const w = opts.w ?? BTN_W;
    const h = opts.h ?? BTN_H;
    const textColor = opts.style === 'gold' ? PALETTE.bgVoid : opts.style === 'accent' ? PALETTE.white : PALETTE.labelMuted;

    const g = this.add.graphics();
    const label = this.domText.add(
      x + w / 2 + (opts.icon === 'none' ? 0 : 9),
      y + h / 2,
      opts.label,
      { color: hexToCss(textColor), strokeColor: hexToCss(PALETTE.outline), sizePx: 17, bold: true, uppercase: true },
      0.5,
      0.5,
    );
    this.content.push(g, label);

    const redraw = (hover: boolean, press: boolean): void => {
      g.clear();
      const dy = press ? 4 : 0;
      if (!press) {
        g.fillStyle(opts.sole, 1);
        g.fillRect(x, y + h, w, 4);
      }

      if (opts.style === 'gold') {
        const top = hover ? PALETTE.white : PALETTE.goldLight;
        g.fillGradientStyle(top, top, PALETTE.reward, PALETTE.reward, 1);
        g.fillRect(x, y + dy, w, h);
        g.lineStyle(2, PALETTE.white, hover ? 1 : 0.9);
      } else if (opts.style === 'accent') {
        g.fillStyle(PALETTE.metalDark, 1);
        g.fillRect(x, y + dy, w, h);
        g.fillStyle(opts.accent, hover ? 0.28 : 0.16);
        g.fillRect(x, y + dy, w, h);
        g.lineStyle(2, opts.accent, 1);
      } else {
        g.fillStyle(PALETTE.metalMid, 1);
        g.fillRect(x, y + dy, w, h);
        g.lineStyle(1, PALETTE.metalEdge, 1);
      }
      g.strokeRect(x + 1, y + dy + 1, w - 2, h - 2);

      const iconCx = x + w / 2 - (label.width / 2 + 7);
      const iconCy = y + dy + h / 2;
      if (opts.icon === 'coin') {
        g.fillStyle(PALETTE.bgVoid, 1);
        g.fillCircle(iconCx, iconCy, 7);
        g.fillStyle(PALETTE.reward, 1);
        g.fillCircle(iconCx, iconCy, 2.5);
      } else if (opts.icon === 'check') {
        g.fillStyle(opts.accent, 1);
        g.fillRect(iconCx - 7, iconCy - 7, 14, 14);
        this.drawCheck(g, iconCx, iconCy, 4, PALETTE.bgVoid);
      }

      label.setPosition(x + w / 2 + (opts.icon === 'none' ? 0 : 9), y + dy + h / 2);
    };
    redraw(false, false);

    if (!opts.interactive) return;
    const zone = this.add.zone(x + w / 2, y + h / 2 + 2, w + 8, h + 10).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => redraw(true, false));
    zone.on('pointerout', () => redraw(false, false));
    zone.on('pointerdown', () => redraw(true, true));
    zone.on('pointerup', () => {
      redraw(true, false);
      playSfx('uiClick');
      opts.onClick?.();
    });
    this.content.push(zone);
  }

  // ---- character scene ---------------------------------------------------

  private buildCharacterScene(item: ShopItem, unlocked: boolean): void {
    const boxX = DETAIL_X + 14;
    const boxW = 56;
    const boxH = 96;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(boxX, PREVIEW_TOP, boxW, boxH);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.strokeRect(boxX + 0.5, PREVIEW_TOP + 0.5, boxW - 1, boxH - 1);
    this.content.push(g);

    if (!unlocked) {
      this.drawLockGlyph(g, boxX + boxW / 2, PREVIEW_TOP + boxH / 2);
      return;
    }

    const colors = skinColorsFor(item.id);
    const visor = colors?.visor ?? PALETTE.cyan;
    const body = colors?.body ?? PALETTE.white;

    // Spot light down the box + a pedestal glow, tinted by the skin's own
    // visor — the one thing that changes color from skin to skin.
    const cone = this.add.graphics();
    const cx = boxX + boxW / 2;
    cone.fillStyle(visor, 0.1);
    cone.fillPoints(
      [
        new Phaser.Geom.Point(cx - 10, PREVIEW_TOP + 2),
        new Phaser.Geom.Point(cx + 10, PREVIEW_TOP + 2),
        new Phaser.Geom.Point(cx + 24, PREVIEW_TOP + boxH - 8),
        new Phaser.Geom.Point(cx - 24, PREVIEW_TOP + boxH - 8),
      ],
      true,
    );
    cone.fillStyle(visor, 0.22);
    cone.fillEllipse(cx, PREVIEW_TOP + boxH - 8, 44, 10);
    this.content.push(cone);

    const sprite = this.addSprite(item.id, cx, PREVIEW_TOP + boxH - 8, 1.7, undefined);
    const prefix = playerTexturePrefix(item.id);
    if (sprite && this.anims.exists(`${prefix}-idle`)) sprite.play(`${prefix}-idle`);

    const pedestal = this.add.graphics();
    pedestal.fillStyle(PALETTE.cyanDim, 1);
    pedestal.fillRect(cx - 18, PREVIEW_TOP + boxH - 9, 36, 4);
    this.content.push(pedestal);

    // Right column: name, rarity, and the three colors the skin is made of.
    const colX = DETAIL_X + 78;
    const name = this.domText.add(
      colX,
      PREVIEW_TOP + 6,
      t(item.nameKey),
      {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 12,
        bold: true,
        wordWrapWidth: DETAIL_W - 86,
        clampLines: 2,
      },
      0,
      0,
    );
    this.content.push(name);

    this.buildRarityBadge(item, colX, PREVIEW_TOP + 38, 0);

    const swatches = [body, this.dimBody(body), visor];
    const sw = this.add.graphics();
    swatches.forEach((color, i) => {
      sw.fillStyle(color, 1);
      sw.fillRect(colX + i * 15, PREVIEW_TOP + 52, 12, 12);
      sw.lineStyle(1, PALETTE.metalMid, 1);
      sw.strokeRect(colX + i * 15 + 0.5, PREVIEW_TOP + 52.5, 11, 11);
    });
    this.content.push(sw);
  }

  /** The limb tone `drawPlayerFrame` paints (body at ~0.85 alpha over the dark well) — computed, not a second hand-picked color. */
  private dimBody(body: number): number {
    const r = Math.round(((body >> 16) & 0xff) * 0.62);
    const g = Math.round(((body >> 8) & 0xff) * 0.62);
    const b = Math.round((body & 0xff) * 0.62);
    return (r << 16) | (g << 8) | b;
  }

  // ---- trail scene (live test run) ---------------------------------------

  private buildTrailScene(item: ShopItem): void {
    const boxX = DETAIL_X + 8;
    const boxW = DETAIL_W - 16;
    const boxH = 64;
    const groundY = PREVIEW_TOP + TRAIL_FLOOR_OFFSET;

    const back = this.add.graphics();
    back.fillStyle(PALETTE.bgVoid, 1);
    back.fillRect(boxX, PREVIEW_TOP, boxW, boxH);
    back.fillStyle(PALETTE.cyanDim, 0.6);
    back.fillRect(boxX, groundY, boxW, 2);
    back.fillStyle(PALETTE.cyanDim, 0.12);
    back.fillRect(boxX, groundY + 2, boxW, boxH - TRAIL_FLOOR_OFFSET - 2);
    this.content.push(back);

    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    const fx = new TrailFx(this, item.id as TrailKind, DETAIL_X + DETAIL_W / 2, groundY);
    this.content.push({ destroy: () => fx.destroy() });

    const sprite = this.textures.exists(`${prefix}-idle-0`)
      ? this.add.sprite(DETAIL_X + DETAIL_W / 2, groundY, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(TRAIL_SPRITE_SCALE)
      : null;
    if (sprite) {
      sprite.play(`${prefix}-run`);
      this.content.push(sprite);
    }

    this.trailPreview = {
      fx,
      sprite,
      prefix,
      anim: 'run',
      x: DETAIL_X + DETAIL_W / 2,
      y: groundY,
      vx: TRAIL_RUN_SPEED,
      vy: 0,
      flipX: false,
      groundY,
      leftX: boxX + 22,
      rightX: boxX + boxW - 22,
      onGround: true,
      nextJumpAtMs: this.time.now + 700,
    };

    // `TrailFx` owns its particle pool internally, so the way to keep it on
    // stage is to repaint the panel around the box right after the pool is
    // created — later elements (name, badge, button) still draw on top.
    this.coverBand(boxX, PREVIEW_TOP, boxW, boxH, PALETTE.cyanDim);
  }

  private stepTrailPreview(delta: number): void {
    const p = this.trailPreview;
    if (!p) return;
    const dt = delta / 1000;
    const now = this.time.now;

    p.x += p.vx * dt;
    if (p.x >= p.rightX) {
      p.x = p.rightX;
      p.vx = -TRAIL_RUN_SPEED;
      p.flipX = true;
    } else if (p.x <= p.leftX) {
      p.x = p.leftX;
      p.vx = TRAIL_RUN_SPEED;
      p.flipX = false;
    }

    if (!p.onGround) {
      p.vy += TRAIL_GRAVITY * dt;
      p.y += p.vy * dt;
      if (p.y >= p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
        p.onGround = true;
        p.nextJumpAtMs = now + TRAIL_JUMP_INTERVAL_MS;
      }
    } else if (now >= p.nextJumpAtMs) {
      // A real jump, so LAUNCH gets its burst and INTERFERENCE reaches the
      // falling speed its own spawn condition needs — the preview runs the
      // production `TrailFx`, not a lookalike.
      p.vy = -TRAIL_JUMP_SPEED;
      p.onGround = false;
      p.fx.onJump(p.x, p.groundY);
    }

    const wanted: TrailPreview['anim'] = p.onGround ? 'run' : p.vy < 0 ? 'jump' : 'fall';
    if (wanted !== p.anim && p.sprite) {
      p.anim = wanted;
      p.sprite.play(`${p.prefix}-${wanted}`, true);
    }
    if (p.sprite) {
      p.sprite.setPosition(Math.round(p.x), Math.round(p.y));
      p.sprite.setFlipX(p.flipX);
    }

    p.fx.update(now, delta, { x: p.x, y: p.y, vx: p.vx, vy: p.vy, flipX: p.flipX }, true);
  }

  // ---- death FX scene (two frames: intact -> the real burst) -------------

  private buildDeathScene(item: ShopItem, unlocked: boolean): void {
    const boxW = 62;
    const boxH = 64;
    const leftX = DETAIL_X + 8;
    const rightX = DETAIL_X + DETAIL_W - 8 - boxW;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(leftX, PREVIEW_TOP, boxW, boxH);
    g.fillRect(rightX, PREVIEW_TOP, boxW, boxH);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.strokeRect(leftX + 0.5, PREVIEW_TOP + 0.5, boxW - 1, boxH - 1);
    g.lineStyle(1, PALETTE.dangerAlt, 0.6);
    g.strokeRect(rightX + 0.5, PREVIEW_TOP + 0.5, boxW - 1, boxH - 1);
    this.content.push(g);

    const arrow = this.add.graphics();
    arrow.fillStyle(PALETTE.dangerAlt, 1);
    const arrowY = PREVIEW_TOP + boxH / 2;
    arrow.fillRect(leftX + boxW + 2, arrowY - 1, 8, 2);
    arrow.fillTriangle(leftX + boxW + 10, arrowY - 4, leftX + boxW + 10, arrowY + 4, leftX + boxW + 14, arrowY);
    this.content.push(arrow);

    if (!unlocked) {
      this.drawLockGlyph(g, rightX + boxW / 2, PREVIEW_TOP + boxH / 2);
      return;
    }

    const skin = InventoryService.getEquipped('character');
    this.addSprite(skin, leftX + boxW / 2, PREVIEW_TOP + boxH - 6, 1.1, undefined);

    const burstCx = rightX + boxW / 2;
    const burstCy = PREVIEW_TOP + boxH - 12;
    const sprite = this.addSprite(skin, burstCx, PREVIEW_TOP + boxH - 6, 1.1, undefined);

    this.previewFx ??= new FxManager(this);
    // The burst is the real gameplay effect, so it also has the real spread —
    // clip it to the little stage instead of letting fragments rain across
    // the panel (emitters sit at depth 120-150, above any drawn cover).
    const clip = this.make.graphics({}, false);
    clip.fillStyle(0xffffff, 1);
    clip.fillRect(rightX, PREVIEW_TOP, boxW, boxH);
    const mask = clip.createGeometryMask();
    this.previewFx.setClipMask(mask);
    this.content.push({
      destroy: () => {
        this.previewFx?.setClipMask(null);
        mask.destroy();
        clip.destroy();
      },
    });

    const variant = item.id as 'static' | 'glitch' | 'data_wipe';
    const trigger = (): void => {
      // `shake: false` — the real death shakes the gameplay camera, which in
      // a shop would jolt the whole screen every couple of seconds.
      this.previewFx?.deathBurst(burstCx, burstCy, variant, false);
      sprite?.setVisible(false);
      this.time.delayedCall(320, () => sprite?.setVisible(true));
    };
    this.replayDeathPreview = trigger;
    this.time.delayedCall(220, trigger);
    this.deathPreviewTimer = this.time.addEvent({ delay: DEATH_PREVIEW_INTERVAL_MS, loop: true, callback: trigger });
  }

  /** Repaints the panel background in a band around a preview stage, so loose particles never leak past it. Drawn before the rest of the panel, so labels and the button still paint on top. */
  private coverBand(x: number, y: number, w: number, h: number, border: number): void {
    const bandBottom = y + h + 4;
    const cover = this.add.graphics();
    cover.fillStyle(PALETTE.bgGraphite, 1);
    cover.fillRect(DETAIL_X + 1, DETAIL_TOP + 19, DETAIL_W - 2, y - DETAIL_TOP - 19);
    cover.fillRect(DETAIL_X + 1, y + h, DETAIL_W - 2, bandBottom - (y + h));
    cover.fillRect(DETAIL_X + 1, y, x - DETAIL_X - 1, h);
    cover.fillRect(x + w, y, DETAIL_X + DETAIL_W - (x + w) - 1, h);
    cover.lineStyle(1, border, 0.6);
    cover.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.content.push(cover);
  }

  // ---- SYSTEM pack scene (real sampled lines) ----------------------------

  private buildSystemScene(item: ShopItem): void {
    const boxX = DETAIL_X + 8;
    const boxW = DETAIL_W - 16;
    const rowH = 20;
    const lines = this.packLines(item.id);

    if (lines.length === 0) {
      const g = this.add.graphics();
      g.fillStyle(PALETTE.systemDim, 0.25);
      g.fillRect(boxX, PREVIEW_TOP, boxW, 64);
      this.content.push(g);
      const fallback = this.domText.add(
        boxX + 8,
        PREVIEW_TOP + 32,
        t('shopSystemSampleUnavailable'),
        {
          color: hexToCss(PALETTE.labelMuted),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 9,
          wordWrapWidth: boxW - 16,
          clampLines: 2,
        },
        0,
        0.5,
      );
      this.content.push(fallback);
      return;
    }

    lines.slice(0, 3).forEach((line, i) => {
      const y = PREVIEW_TOP + i * (rowH + 4);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.systemDim, 0.35);
      g.fillRect(boxX, y, boxW, rowH);
      g.fillStyle(PALETTE.system, 1);
      g.fillRect(boxX, y, 2, rowH);
      this.content.push(g);

      const text = this.domText.add(
        boxX + 6,
        y + rowH / 2,
        line.ru.toUpperCase(),
        {
          color: hexToCss(PALETTE.systemLight),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 9,
          wordWrapWidth: boxW - 12,
          clampLines: 1,
        },
        0,
        0.5,
      );
      this.content.push(text);
    });
  }

  // ---- right column ------------------------------------------------------

  private buildRightColumn(category: ShopCategory, items: ShopItem[]): void {
    const colW = this.scale.width - RIGHT_COL_X - 8;
    if (colW < RIGHT_COL_MIN_W) {
      this.systemLineLabel = null;
      return;
    }

    const systemH = category === 'character' ? 96 : DETAIL_H;
    const bg = this.add.rectangle(RIGHT_COL_X, DETAIL_TOP, colW, systemH, PALETTE.system, 0.12).setOrigin(0, 0);
    const edge = this.add.rectangle(RIGHT_COL_X, DETAIL_TOP, 2, systemH, PALETTE.system, 1).setOrigin(0, 0);
    this.content.push(bg, edge);

    const heading = this.domText.add(
      RIGHT_COL_X + 8,
      DETAIL_TOP + 9,
      'SYSTEM',
      { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
      0,
      0.5,
    );
    this.content.push(heading);

    const label = this.domText.add(
      RIGHT_COL_X + 8,
      DETAIL_TOP + 22,
      this.systemLineText,
      {
        color: hexToCss(PALETTE.systemLight),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 10,
        wordWrapWidth: colW - 16,
        clampLines: category === 'character' ? 5 : 12,
      },
      0,
      0,
    );
    this.content.push(label);
    this.systemLineLabel = label;

    if (category !== 'character') return;

    const collY = DETAIL_TOP + systemH + 10;
    const collH = DETAIL_H - systemH - 10;
    const collBg = this.add.rectangle(RIGHT_COL_X, collY, colW, collH, PALETTE.metalDark, 1).setOrigin(0, 0);
    this.content.push(collBg);

    const collHeading = this.domText.add(
      RIGHT_COL_X + 8,
      collY + 10,
      t('shopCollection'),
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9 },
      0,
      0.5,
    );
    this.content.push(collHeading);

    const chip = 9;
    const chipGap = 3;
    const perRow = Math.max(1, Math.floor((colW - 16) / (chip + chipGap)));
    const chips = this.add.graphics();
    items.forEach((item, i) => {
      const owned = this.isUnlocked(item) && this.isOwned(item);
      chips.fillStyle(owned ? skinColorsFor(item.id)?.visor ?? PALETTE.cyan : PALETTE.metalEdge, 1);
      chips.fillRect(
        RIGHT_COL_X + 8 + (i % perRow) * (chip + chipGap),
        collY + 22 + Math.floor(i / perRow) * (chip + chipGap),
        chip,
        chip,
      );
    });
    this.content.push(chips);

    const ownedCount = items.filter((item) => this.isUnlocked(item) && this.isOwned(item)).length;
    const count = this.domText.add(
      RIGHT_COL_X + 8,
      collY + collH - 14,
      `${ownedCount} / ${items.length}`,
      { color: hexToCss(PALETTE.textMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 12, bold: true },
      0,
      0.5,
    );
    this.content.push(count);
  }

  private handleSystemComment(payload: { text: string; category: string }): void {
    if (payload.category !== 'shop') return;
    // Kept on screen until the next line replaces it — the SYSTEM panel is a
    // fixture of the showroom, not a toast that blinks out and leaves a hole.
    this.systemLineText = payload.text;
    this.systemLineLabel?.setText(payload.text);
  }

  // ---- premium ("БЕЗ РЕК.") ----------------------------------------------

  private renderPremiumShowroom(): void {
    const items = this.visibleItems('premium');
    if (!this.selectedByCategory.has('premium')) this.selectedByCategory.set('premium', items[0]!.id);
    const selected = this.selectedItem('premium');
    const owned = this.isOwned(selected);

    const offerX = GRID_X;
    const offerY = 40;
    const offerW = 252;
    const offerH = 198;
    const headerH = 26;

    const body = this.add.graphics();
    body.fillStyle(PALETTE.metalDark, 1);
    body.fillRect(offerX, offerY, offerW, offerH);
    body.lineStyle(2, PALETTE.reward, 1);
    body.strokeRect(offerX + 1, offerY + 1, offerW - 2, offerH - 2);
    this.content.push(body);

    // Two real products share this tab, so the gold bar doubles as the
    // selector between them — short labels, because the offer's own headline
    // moves inside the card where it has the full 252px to breathe.
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
        it.id === 'remove_ads' ? t('shopCategoryPremium') : t(it.nameKey),
        {
          color: hexToCss(active ? PALETTE.bgVoid : PALETTE.labelMuted),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 11,
          bold: true,
          uppercase: true,
        },
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

    // Headline row — the gold diamond plus the promise, at full card width.
    const bannerY = offerY + headerH + 18;
    const diamond = this.add.graphics();
    diamond.fillStyle(PALETTE.reward, 1);
    diamond.save();
    diamond.translateCanvas(offerX + 20, bannerY);
    diamond.rotateCanvas(Math.PI / 4);
    diamond.fillRect(-6, -6, 12, 12);
    diamond.restore();
    this.content.push(diamond);

    const banner = this.domText.add(
      offerX + 34,
      bannerY,
      selected.id === 'remove_ads' ? t('shopNoAdsForever') : t('shopSystemAccess'),
      { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), sizePx: 14, bold: true, uppercase: true },
      0,
      0.5,
    );
    this.content.push(banner);

    const features =
      selected.id === 'remove_ads'
        ? [t('shopNoAdsFeature1'), t('shopNoAdsFeature2'), t('shopNoAdsFeature3')]
        : [t('shopBundleFeature'), t('shopSkinError404'), t('shopFxDataWipe'), t('shopPackCorrupted')];

    features.forEach((line, i) => {
      const y = bannerY + 24 + i * 22;
      const check = this.add.graphics();
      check.fillStyle(PALETTE.patrolVisor, 1);
      check.fillRect(offerX + 14, y - 6, 12, 12);
      this.drawCheck(check, offerX + 20, y, 3.5, PALETTE.bgVoid);
      this.content.push(check);

      const text = this.domText.add(
        offerX + 32,
        y,
        line,
        {
          color: hexToCss(PALETTE.white),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 11,
          bold: true,
          wordWrapWidth: offerW - 46,
          clampLines: 1,
        },
        0,
        0.5,
      );
      this.content.push(text);
    });

    // The quiet honesty line, in the mockup's own "empty checkbox" style.
    const noteY = offerY + offerH - 22;
    const noteBox = this.add.graphics();
    noteBox.lineStyle(2, PALETTE.labelMuted, 1);
    noteBox.strokeRect(offerX + 14, noteY - 6, 12, 12);
    this.content.push(noteBox);
    const note = this.domText.add(
      offerX + 32,
      noteY,
      selected.id === 'remove_ads' ? t('shopNoAdsNote') : t(selected.descriptionKey),
      {
        color: hexToCss(PALETTE.labelMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 10,
        wordWrapWidth: offerW - 46,
        clampLines: 1,
      },
      0,
      0.5,
    );
    this.content.push(note);

    this.buildPremiumPurchasePanel(selected, owned, offerY, offerH);
    this.buildPremiumSystemColumn(offerY, offerH);
  }

  /** Owner's amendments over the mockup: no "ask an adult" line, no manual restore button (`PurchaseManager.restorePurchases()` already runs at every boot) — the buy button centers in the space they freed. */
  private buildPremiumPurchasePanel(item: ShopItem, owned: boolean, top: number, h: number): void {
    const x = DETAIL_X;
    const w = DETAIL_W;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.fillRect(x, top, w, h);
    g.lineStyle(1, PALETTE.goldDim, 1);
    g.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
    this.content.push(g);

    const title = this.domText.add(
      x + w / 2,
      top + 16,
      owned ? t('shopNoAdsOwned') : t('shopOneTimePurchase'),
      {
        // No `clampLines` on a centered label — a centered -webkit-box sizes
        // to its first break opportunity, which cuts short strings mid-word.
        color: hexToCss(owned ? PALETTE.patrolVisor : PALETTE.labelMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        bold: true,
      },
      0.5,
      0.5,
    );
    this.content.push(title);

    const realPrice = item.productId ? this.catalogPricesById.get(item.productId) : undefined;
    const priceText = realPrice ?? (this.catalogLoaded ? t('shopCatalogUnavailable') : '…');
    const price = this.domText.add(
      x + w / 2,
      top + 44,
      owned ? t('shopEquipped') : priceText,
      realPrice && !owned
        ? { color: hexToCss(PALETTE.reward), strokeColor: hexToCss(PALETTE.outline), sizePx: 28, bold: true }
        : {
            color: hexToCss(owned ? PALETTE.reward : PALETTE.labelMuted),
            strokeColor: hexToCss(PALETTE.outline),
            sizePx: owned ? 16 : 11,
            bold: true,
            wordWrapWidth: w - 20,
            clampLines: 2,
          },
      0.5,
      0.5,
    );
    this.content.push(price);

    const dividerY = top + 68;
    const divider = this.add.graphics();
    divider.fillStyle(PALETTE.goldDim, 1);
    divider.fillRect(x + 12, dividerY, w - 24, 1);
    this.content.push(divider);

    if (owned) return;

    const btnH = 44;
    const btnTop = Math.round(dividerY + (top + h - 8 - dividerY - btnH) / 2);
    this.drawShowroomButton({
      label: t('shopBuy'),
      style: 'gold',
      accent: PALETTE.reward,
      sole: PALETTE.goldSole,
      icon: 'coin',
      interactive: true,
      onClick: () => void this.handleBuy(item),
      x: x + 10,
      y: btnTop,
      w: w - 20,
      h: btnH,
    });
  }

  private buildPremiumSystemColumn(top: number, h: number): void {
    const colW = this.scale.width - RIGHT_COL_X - 8;
    if (colW < RIGHT_COL_MIN_W) {
      this.systemLineLabel = null;
      return;
    }
    const bg = this.add.rectangle(RIGHT_COL_X, top, colW, h, PALETTE.system, 0.12).setOrigin(0, 0);
    const edge = this.add.rectangle(RIGHT_COL_X, top, 2, h, PALETTE.system, 1).setOrigin(0, 0);
    this.content.push(bg, edge);

    const heading = this.domText.add(
      RIGHT_COL_X + 8,
      top + 12,
      'SYSTEM',
      { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
      0,
      0.5,
    );
    this.content.push(heading);

    const label = this.domText.add(
      RIGHT_COL_X + 8,
      top + 26,
      this.systemLineText,
      {
        color: hexToCss(PALETTE.systemLight),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 10,
        wordWrapWidth: colW - 16,
        clampLines: 12,
      },
      0,
      0,
    );
    this.content.push(label);
    this.systemLineLabel = label;
  }

  // ---- purchase flow -----------------------------------------------------

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
      this.renderCategory();
      commentOnShop(isFirstCosmetic ? 'first_cosmetic' : 'purchase_confirmed');
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
    this.renderCategory();
    if (result === 'success') {
      commentOnShop(item.productId === 'remove_ads' || item.productId === 'system_access' ? 'no_ads' : 'purchase_confirmed');
    }
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

  // ---- GET CREDITS sub-view ---------------------------------------------

  private openGetCredits(): void {
    this.view = 'credits';
    this.setRailVisible(false);
    this.teardownLivePreview();
    this.clearContent();
    this.systemLineLabel = null;
    const { width } = this.scale;

    const title = this.domText.add(
      width / 2,
      44,
      t('shopGetCredits'),
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), sizePx: 16, bold: true, uppercase: true },
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
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), sizePx: 10 },
      0.5,
      0.5,
    );
    this.content.push(g, domLabel);
    const h = 20;

    const redraw = (hover: boolean): void => {
      g.clear();
      g.fillStyle(PALETTE.metalMid, hover ? 0.42 : 0.22);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      g.lineStyle(1, hover ? PALETTE.cyan : PALETTE.cyanDim, 1);
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
