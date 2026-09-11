import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import type { UiStringKey } from '@/i18n/ui';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import type { DomTextHandle, DomTextOptions } from '@/ui/DomTextOverlay';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { attachEscape } from '@/ui/ScreenChrome';
import { playSfx } from '@/audio/SfxManager';
import { EventBus } from '@/core/EventBus';
import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import type { InventoryCategory } from '@/services/InventoryService';
import { PurchaseManager } from '@/services/PurchaseManager';
import { AdsService } from '@/services/AdsService';
import { SaveService } from '@/services/SaveService';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { LEVELS_PER_SECTOR } from '@/gameplay/sectors';
import { SHOP_ITEMS } from '@/data/shop/items';
import type { ShopCategory, ShopItem, ShopRarity } from '@/data/shop/items';
import { CREDIT_PACKS } from '@/data/shop/creditPacks';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { commentOnShop, commentOnShopItem } from '@/data/dialogues/shop';
import type { ShopCommentKind } from '@/data/dialogues/shop';
import { playerTexturePrefix, skinColorsFor } from '@/data/shop/skinVisuals';
import { PHYSICS } from '@/config/physics';
import { TrailFx } from '@/gameplay/TrailFx';
import type { TrailKind } from '@/gameplay/TrailFx';
import { FxManager } from '@/fx/FxManager';
import { PACKS } from '@/data/dialogues';
import { rebuildOnResize } from '@/ui/relayout';
import { drawCheck } from '@/ui/glyphs';

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
const DETAIL_TOP = 32;
const DETAIL_H = 206;
const PREVIEW_TOP = 56;
/** Fitting-room vertical rhythm, measured off the mockup and then given the
 * slack the real DOM text needs: a 9px label renders 11.7px tall (line-height
 * 1.3), so a two-line description occupies 23.4px, not the mockup's flat 22 —
 * the earlier layout took the mockup's numbers literally and the second line
 * printed straight through the status row underneath it. */
const NAME_Y = 132;
const DESC_TOP = 146;
const STATUS_Y = 180;
const CHAR_BOX_H = 84;
const BTN_TOP = 196;
const BTN_H = 36;
/**
 * The mockup's own geometry at its full 620px canvas: fitting panel at 330
 * (146 wide) and SYSTEM's column at 492. Below that width the three blocks
 * are squeezed rather than dropped — the owner's call after SYSTEM's line
 * disappeared entirely on a 480px canvas, which is the one element the game
 * is named after.
 */
const WIDE_DETAIL_X = 330;
const WIDE_DETAIL_W = 146;
const WIDE_SYS_X = 492;
const MIN_SYS_W = 86;
const MIN_DETAIL_W = 126;
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
/**
 * Half the real run speed. The stage is 130px wide against a level's several
 * thousand, so a runner moving at `PHYSICS.moveSpeed` crosses it three times
 * a second and reads as a twitch rather than a run (owner's call after
 * watching it). The trail's own spacing is set by this speed, so the preview
 * shows a slightly denser trail than play — the trade the owner picked.
 */
const TRAIL_RUN_SPEED = PHYSICS.moveSpeed * 0.5;
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
  /** The catalog's own numeric `priceValue`, kept so "best value" can be computed from real prices instead of guessed from the pack order. */
  private catalogValueById = new Map<string, number>();
  private catalogLoaded = false;
  private view: 'main' | 'credits' = 'main';

  private content: Disposable[] = [];
  private railHandles: RailHandle[] = [];
  private domText!: DomTextOverlay;
  private walletLabel!: DomTextHandle;
  /** Width-dependent columns — see `WIDE_DETAIL_X` and `layout()`. */
  private detailX = WIDE_DETAIL_X;
  private detailW = WIDE_DETAIL_W;
  private sysX = WIDE_SYS_X;
  private sysW = 120;
  private btnX = WIDE_DETAIL_X + 6;
  private btnW = WIDE_DETAIL_W - 12;
  private titleLabel!: DomTextHandle;
  private subtitleLabel: DomTextHandle | null = null;
  private systemLineLabel: DomTextHandle | null = null;
  private systemLineText = '';

  private trailPreview: TrailPreview | null = null;
  private previewFx: FxManager | null = null;
  private deathPreviewTimer: Phaser.Time.TimerEvent | null = null;
  private replayDeathPreview: (() => void) | null = null;

  constructor() {
    super('ShopScene');
  }

  create(data?: { category?: ShopCategory }): void {
    rebuildOnResize(this);
    const { width, height } = this.scale;

    // The scene instance is reused every time the player reopens the shop
    // (`MainMenuScene.openOverlay` calls `scene.launch` again), so anything
    // holding Graphics/Zones from a previous run has to be dropped here —
    // those objects were destroyed by that run's shutdown.
    this.railHandles = [];
    this.content = [];
    this.previewFx = null;
    this.view = 'main';
    // Launched from the menu's "change skin" tile, the shop has to open on
    // skins — not on whatever tab the last visit happened to end on.
    if (data?.category) {
      const index = CATEGORIES.indexOf(data.category);
      if (index >= 0) this.categoryIndex = index;
    }

    this.layout(width);

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

    attachEscape(this, () => {
      if (this.view === 'main') this.scene.stop();
      else this.backToMain();
    });

    void this.loadCatalog();
    this.renderCategory();
    commentOnShop('open');
  }

  /**
   * The mockup's columns at 620px, squeezed proportionally below it. SYSTEM's
   * column keeps a floor of `MIN_SYS_W` and the fitting panel gives up 20px
   * before the card grid pays for the rest, so the commentary is always on
   * screen at any width the game supports.
   */
  private layout(width: number): void {
    if (width >= WIDE_SYS_X + 8 + MIN_SYS_W + 24) {
      this.detailX = WIDE_DETAIL_X;
      this.detailW = WIDE_DETAIL_W;
      this.sysX = WIDE_SYS_X;
    } else {
      this.detailW = MIN_DETAIL_W;
      this.sysX = width - 8 - MIN_SYS_W;
      this.detailX = this.sysX - 8 - this.detailW;
    }
    this.sysW = width - 8 - this.sysX;
    this.btnX = this.detailX + 6;
    this.btnW = this.detailW - 12;
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

    this.titleLabel = this.pixel(36, 14, t('shop'), PALETTE.white, 2, 0, 0.5, false, { sizePx: 19, letterSpacing: 2 });

    const walletW = 116;
    const walletX = width - 8 - walletW;
    if (walletX >= 150) {
      // Positioned off the title's own measured width rather than a fixed
      // offset — a fixed number went stale the moment the type it was tuned
      // for changed.
      this.subtitleLabel = this.pixel(40 + this.titleLabel.width, 15, t('shopTitle'), PALETTE.labelMuted, 1, 0, 0.5, false, {
        sizePx: 10,
      });
    }

    const wallet = this.add.graphics();
    wallet.fillStyle(PALETTE.metalDark, 1);
    wallet.lineStyle(1, PALETTE.goldDim, 1);
    wallet.fillRect(walletX, 4, walletW, 20);
    wallet.strokeRect(walletX, 4, walletW, 20);
    this.coin(walletX + 14, 14, 11, false, false);
    wallet.fillStyle(PALETTE.goldDim, 1);
    wallet.fillRect(walletX + walletW - 20, 8, 13, 13);
    wallet.fillStyle(PALETTE.reward, 1);
    wallet.fillRect(walletX + walletW - 15, 11, 3, 7);
    wallet.fillRect(walletX + walletW - 17, 13, 7, 3);

    this.walletLabel = this.pixel(walletX + 24, 14, this.balanceText(), PALETTE.reward, 2, 0, 0.5, false, { sizePx: 15 });

    const walletZone = this.add.zone(walletX + walletW / 2, 14, walletW, 20).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    walletZone.on('pointerup', () => {
      playSfx('uiClick');
      if (this.view === 'main') this.openGetCredits();
    });
  }

  /**
   * A label in the UI's pixel typeface (see `ui/fonts`), which is every
   * technical string on the screen: titles, counters, prices,
   * statuses, SYSTEM's own voice. Drawn as DOM text over the canvas, so the
   * browser paints it at native screen resolution instead of it being
   * rasterised into the 270px game canvas and then blown up.
   *
   * `step` is the mockup's size ladder (its pixel labels cluster at 9-12,
   * 15-19 and 22-30px); `extra` overrides the exact size or spacing where the
   * mockup names one.
   */
  private pixel(
    x: number,
    y: number,
    text: string,
    color: number,
    step: number,
    originX = 0,
    originY = 0.5,
    track = false,
    extra?: Partial<DomTextOptions>,
  ): DomTextHandle {
    const sizePx = step >= 4 ? 30 : step === 3 ? 22 : step === 2 ? 16 : 11;
    const label = this.domText.add(
      x,
      y,
      text,
      { color: hexToCss(color), font: 'pixel', sizePx, letterSpacing: 1, uppercase: true, ...extra },
      originX,
      originY,
    );
    if (track) this.content.push(label);
    return label;
  }

  /** The mockup's coin: a real circle with a rim, on the DOM layer so its edge stays round. */
  private coin(cx: number, cy: number, d: number, dim: boolean, track = true): DomTextHandle {
    const handle = this.domText.addShape(
      cx,
      cy,
      d,
      d,
      {
        background: hexToCss(dim ? PALETTE.goldDim : PALETTE.reward),
        border: hexToCss(dim ? PALETTE.goldSole : PALETTE.goldEdge),
        radius: d / 2,
      },
      0.5,
      0.5,
    );
    if (track) this.content.push(handle);
    return handle;
  }

  private balanceText(): string {
    return String(CurrencyService.getBalance());
  }

  private refreshBalance(): void {
    this.walletLabel.setText(this.balanceText());
  }

  private async loadCatalog(): Promise<void> {
    const catalog = await PurchaseManager.getCatalog();
    for (const [id, product] of catalog) {
      this.catalogPricesById.set(id, product.price);
      const value = Number.parseFloat(product.priceValue);
      if (Number.isFinite(value) && value > 0) this.catalogValueById.set(id, value);
    }
    this.catalogLoaded = true;
    if (this.view === 'main') this.renderCategory();
    else this.openGetCredits();
  }

  // ---- small shared painters ------------------------------------------


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
    const category = this.currentCategory();
    commentOnShopItem(this.selectedItem(category).id, CATEGORY_COMMENT[category]);
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
    this.pixel(
      GRID_X,
      36,
      `${t(CATEGORY_LABEL[category])} · ${owned} ${t('shopOf')} ${items.length} ${t('shopUnlockedSuffix')}`,
      PALETTE.labelMuted,
      1,
      0,
      0.5,
      true,
      { sizePx: 10 },
    );

    // The grid takes whatever the rail, the fitting panel and SYSTEM's column
    // leave. At the mockup's 620px that works out to its own 78px cards in
    // three columns; on a narrower canvas it drops to two rather than
    // shrinking every card into illegibility.
    const gridW = this.detailX - 8 - GRID_X;
    const gapX = 9;
    const gapY = 8;
    const wide = Math.floor((gridW - gapX * 2) / 3);
    const cols = items.length > 4 && wide >= 70 ? 3 : 2;
    const cardW = Math.floor((gridW - gapX * (cols - 1)) / cols);
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
    // The mockup's card is 60px of art over a 28px name plate inside a 92px
    // box; taking `h - 28` instead pushed the art down and the name/price
    // with it. The art keeps its 60px and the plate absorbs whatever is left.
    const previewH = Math.min(60, h - 28);
    const plateH = h - previewH;
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
      flag.fillRect(x + 1, y + 1, 26, 11);
      this.content.push(flag);
      this.pixel(x + 14, y + 7, t('shopRarityPremium'), PALETTE.bgVoid, 1, 0.5, 0.5, true);
    }

    const labelX = centered ? x + w / 2 : x + 8;
    const labelOrigin = centered ? 0.5 : 0;
    const plateMid = y + previewH + plateH / 2;
    const cardNameText = unlocked ? t(item.nameKey) : t('shopLockedName');
    const cardNameColor = unlocked ? PALETTE.white : PALETTE.labelMuted;
    const cardNameAvailable = w - (centered ? 6 : 16);

    // The longest item names ("СЛЕД ДАННЫХ") don't fit an 11px bold label at
    // the card widths a narrow canvas leaves (two columns instead of three)
    // — shrink one card-name at a time rather than letting it print over the
    // neighboring card.
    let cardNameSize = centered ? 10 : 11;
    while (cardNameSize > 8) {
      const probe = this.domText.add(-1000, -1000, cardNameText, { color: hexToCss(cardNameColor), sizePx: cardNameSize, bold: true }, 0, 0.5);
      const fits = probe.width <= cardNameAvailable;
      probe.destroy();
      if (fits) break;
      cardNameSize -= 1;
    }

    const name = this.domText.add(
      labelX,
      plateMid - 6,
      cardNameText,
      {
        color: hexToCss(cardNameColor),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: cardNameSize,
        bold: true,
        wordWrapWidth: cardNameAvailable,
        clampLines: 1,
      },
      labelOrigin,
      0.5,
    );
    this.content.push(name);

    const stateY = plateMid + 6;
    if (!unlocked) {
      this.pixel(labelX, stateY, t('shopLockedCondition'), PALETTE.system, 1, labelOrigin, 0.5, true, { sizePx: 9 });
    } else if (equipped || owned) {
      this.pixel(
        labelX,
        stateY,
        equipped ? t('shopEquipped') : t('shopOwned'),
        equipped ? accent : PALETTE.labelMuted,
        1,
        labelOrigin,
        0.5,
        true,
        { sizePx: 9 },
      );
    } else if (item.priceCredits !== undefined) {
      // Coin + number, the same money shape the wallet uses — never a bare
      // "150 CR" string (mockup: price always reads as currency).
      const coinX = centered ? x + w / 2 - 14 : x + 12;
      this.coin(coinX, stateY, 8, !affordable);
      this.pixel(
        coinX + 8,
        stateY,
        String(item.priceCredits),
        affordable ? PALETTE.reward : PALETTE.goldSole,
        1,
        0,
        0.5,
        true,
        { sizePx: 12 },
      );
    }

    if (equipped) {
      const badge = this.add.graphics();
      badge.fillStyle(accent, 1);
      badge.fillRect(x + w - 16, y - 4, 16, 16);
      drawCheck(badge, x + w - 8, y + 4, 4, PALETTE.bgVoid);
      this.content.push(badge);
    }

    if (unlocked) {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        this.selectedByCategory.set(category, item.id);
        this.renderCategory();
        commentOnShopItem(item.id, CATEGORY_COMMENT[category]);
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
      // A narrow canvas gives the grid shorter cards; the mockup's 1.45 has to
      // give way rather than let the android grow out of its own well and over
      // the card above it.
      const sprite = this.addSprite(item.id, cx, y + h - 2, 1.45, litColors ? undefined : PALETTE.textDisabled);
      if (sprite && sprite.displayHeight > h - 4) sprite.setScale((h - 4) / sprite.height);
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
      const runner = this.addSprite(equippedSkin, spriteX, groundY, 0.9, litColors ? undefined : PALETTE.textDisabled);
      if (runner && runner.displayHeight > h - 6) runner.setScale((h - 6) / runner.height);
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
    g.fillRect(this.detailX, DETAIL_TOP, this.detailW, DETAIL_H);
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(this.detailX, DETAIL_TOP, this.detailW, 18);
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(this.detailX, DETAIL_TOP + 18, this.detailW, 1);
    g.lineStyle(1, border, 1);
    g.strokeRect(this.detailX + 0.5, DETAIL_TOP + 0.5, this.detailW - 1, DETAIL_H - 1);
    this.content.push(g);

    const headerAvailable = this.detailW - 12;
    let headerSize = 10;
    while (headerSize > 7) {
      const probe = this.pixel(-1000, -1000, headerText, headerColor, 1, 0, 0.5, false, { sizePx: headerSize });
      const fits = probe.width <= headerAvailable;
      probe.destroy();
      if (fits) break;
      headerSize -= 1;
    }
    this.pixel(this.detailX + this.detailW / 2, DETAIL_TOP + 10, headerText, headerColor, 1, 0.5, 0.5, true, {
      sizePx: headerSize,
      wordWrapWidth: headerAvailable,
      clampLines: 1,
    });
  }

  private buildDetailPanel(category: ShopCategory, item: ShopItem): void {
    const accent = CATEGORY_ACCENT[category];
    const unlocked = this.isUnlocked(item);

    if (category === 'character') {
      this.detailFrame(PALETTE.cyanDim, t('shopFittingRoom'), PALETTE.cyan);
      this.buildCharacterScene(item, unlocked);
      this.buildLegend(item, DESC_TOP);
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
      // One rhythm for all three: the stage ends at 120, the name row sits
      // clear of it, and the legend's two lines stop above the status row.
      this.buildNameRow(item, NAME_Y);
      this.buildLegend(item, DESC_TOP);
    }

    this.buildStatusRow(category, item, unlocked);
    this.buildDetailButton(category, item, unlocked, accent);
  }

  /** Name + rarity badge on one line — the layout every non-character panel uses (the character panel puts them in its own right-hand column instead). */
  private buildNameRow(item: ShopItem, y: number): void {
    // The badge is built first and its *real* rendered width read back, so
    // the name label knows exactly how much room is left — a character-count
    // estimate went stale the moment the type behind it changed, and printed
    // straight through the badge.
    const badgeW = this.buildRarityBadge(item, this.detailX + this.detailW - 8, y, 1);
    const available = this.detailX + this.detailW - 8 - badgeW - 6 - (this.detailX + 8);
    const nameText = t(item.nameKey);

    // A long item name against a wide rarity pill ("СЛЕД ДАННЫХ" + "БАЗА")
    // doesn't always fit the mockup's 12px in the space left over — shrink
    // one step at a time rather than clamping to one line and losing the
    // second word to an ellipsis. Measured in the name's own font (Rubik,
    // bold) — probing with the pixel font would measure the wrong glyphs.
    let sizePx = this.detailW >= WIDE_DETAIL_W ? 12 : 10;
    while (sizePx > 9) {
      const probe = this.domText.add(-1000, -1000, nameText, { color: hexToCss(PALETTE.white), sizePx, bold: true }, 0, 0.5);
      const fits = probe.width <= available;
      probe.destroy();
      if (fits) break;
      sizePx -= 1;
    }

    const name = this.domText.add(
      this.detailX + 8,
      y,
      nameText,
      {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx,
        bold: true,
        wordWrapWidth: available,
        clampLines: 1,
      },
      0,
      0.5,
    );
    this.content.push(name);
  }

  /** Draws the rarity pill and returns its actual rendered width, so a caller laying out a sibling doesn't have to guess it. */
  private buildRarityBadge(item: ShopItem, x: number, y: number, originX: number): number {
    const rarity = item.rarity ?? 'common';
    const color = RARITY_COLOR[rarity];
    const label = t(RARITY_LABEL[rarity]);

    // Built off-screen first purely to measure its real width in the live
    // font — moved into place once the box beneath it is sized to match.
    const text = this.pixel(-1000, -1000, label, color, 1, 0.5, 0.5, false, { sizePx: 9 });
    const w = text.width + 8;
    const boxX = originX === 1 ? x - w : x;
    text.setPosition(boxX + w / 2, y);
    this.content.push(text);

    const g = this.add.graphics();
    g.fillStyle(color, 0.16);
    g.fillRect(boxX, y - 7, w, 14);
    g.lineStyle(1, color, 1);
    g.strokeRect(boxX + 0.5, y - 6.5, w - 1, 13);
    this.content.push(g);
    return w;
  }

  private buildLegend(item: ShopItem, y: number): void {
    const legend = this.domText.add(
      this.detailX + 8,
      y,
      t(item.descriptionKey),
      {
        color: hexToCss(PALETTE.textMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        wordWrapWidth: this.detailW - 16,
        clampLines: 2,
      },
      0,
      0,
    );
    this.content.push(legend);
  }

  /** The row above the button: what the purchase costs you on the left, the price (or a live action) on the right. */
  private buildStatusRow(category: ShopCategory, item: ShopItem, unlocked: boolean): void {
    const y = STATUS_Y;
    const leftX = this.detailX + 8;
    const rightX = this.detailX + this.detailW - 8;
    const owned = unlocked && this.isOwned(item);
    const equipped = owned && this.isEquipped(item);
    const price = item.priceCredits;
    const balance = CurrencyService.getBalance();

    if (!unlocked) {
      this.pixel(leftX, y, t('shopLockedCondition'), PALETTE.system, 1, 0, 0.5, true, { sizePx: 9 });
      return;
    }

    if (owned) {
      this.pixel(leftX, y, equipped ? t('shopWorn') : t('shopOwned'), PALETTE.labelMuted, 1, 0, 0.5, true, {
        sizePx: 9,
      });

      // "ЕЩЁ РАЗ" replays the death effect on demand — the one secondary
      // action in this row that maps onto something the preview really does.
      if (category === 'death_fx' && this.replayDeathPreview) {
        this.pixel(rightX, y, t('shopReplay'), PALETTE.dangerAlt, 1, 1, 0.5, true, { sizePx: 9 });
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
    const delta = affordable ? balance - price : price - balance;
    const captionColor = affordable ? PALETTE.labelMuted : PALETTE.dangerAlt;
    const rowW = rightX - leftX;

    const fits = (text: string, sizePx: number, priceW: number): boolean => {
      const probe = this.pixel(-1000, -1000, text, PALETTE.white, 1, 0, 0.5, false, { sizePx });
      const w = probe.width;
      probe.destroy();
      return w + 8 + priceW + 14 <= rowW;
    };

    // A 3-digit price ("ОСТАНЕТСЯ 680" beside "680") does not fit this row
    // at the mockup's fixed 15px/9px pair on this panel's fixed width once
    // the balance is 3 digits too. The price shrinks first (it has more
    // headroom before turning
    // illegible); if the full caption still doesn't fit even at a small
    // floor size, it swaps for the rail's own abbreviation convention
    // ("БЕЗ РЕК.") rather than clipping mid-word into an ellipsis.
    const full = `${affordable ? t('shopWillRemain') : t('shopNotEnough')} ${delta}`;
    const short = `${affordable ? t('shopWillRemainShort') : t('shopNotEnoughShort')} ${delta}`;
    let priceSize = 15;
    let caption = full;
    let captionSize = 9;
    outer: for (; priceSize >= 11; priceSize -= 1) {
      const priceProbe = this.pixel(-1000, -1000, String(price), PALETTE.white, 2, 0, 0.5, false, { sizePx: priceSize });
      const priceW = priceProbe.width;
      priceProbe.destroy();
      for (const text of [full, short]) {
        for (let size = 9; size >= 7; size -= 1) {
          if (fits(text, size, priceW)) {
            caption = text;
            captionSize = size;
            break outer;
          }
        }
      }
      caption = short;
      captionSize = 7;
    }

    const priceText = this.pixel(rightX, y, String(price), affordable ? PALETTE.reward : PALETTE.goldSole, 2, 1, 0.5, true, {
      sizePx: priceSize,
    });
    this.coin(rightX - priceText.width - 9, y, 10, !affordable);

    this.pixel(leftX, y, caption, captionColor, 1, 0, 0.5, true, {
      sizePx: captionSize,
      wordWrapWidth: Math.max(40, rightX - priceText.width - 14 - leftX),
      clampLines: 1,
    });
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
   * white rim, near-black label — white on that lit face was unreadable);
   * `accent` is the category-colored equip button (dark face, colored rim and
   * icon, white label). Both label colors are the mockup's own.
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
    const x = opts.x ?? this.btnX;
    const y = opts.y ?? BTN_TOP;
    const w = opts.w ?? this.btnW;
    const h = opts.h ?? BTN_H;
    const textColor =
      opts.style === 'muted' ? PALETTE.labelMuted : opts.style === 'gold' ? PALETTE.bgVoid : PALETTE.white;

    const g = this.add.graphics();
    const label = this.domText.add(
      x + w / 2 + (opts.icon === 'none' ? 0 : 9),
      y + h / 2,
      opts.label,
      // Mockup: Rubik 800 at 20px, no outline. The size follows the button,
      // which shrinks with the panel on a narrow canvas.
      { color: hexToCss(textColor), sizePx: w >= 120 ? 20 : w >= 100 ? 16 : 13, bold: true, uppercase: true },
      0.5,
      0.5,
    );
    this.content.push(g, label);

    // The mockup's coin is a round disc with a lit centre; drawn into the game
    // canvas at 14px it upscales into a visibly square-edged blob, so it lives
    // on the DOM layer with the label and follows the button's press offset.
    const iconDisc =
      opts.icon === 'coin'
        ? this.domText.addShape(x, y, 14, 14, { background: hexToCss(PALETTE.bgVoid), radius: 7 }, 0.5, 0.5)
        : null;
    const iconPip =
      opts.icon === 'coin'
        ? this.domText.addShape(x, y, 5, 5, { background: hexToCss(PALETTE.reward), radius: 2.5 }, 0.5, 0.5)
        : null;
    if (iconDisc) this.content.push(iconDisc);
    if (iconPip) this.content.push(iconPip);

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
        iconDisc?.setPosition(iconCx, iconCy);
        iconPip?.setPosition(iconCx, iconCy);
      } else if (opts.icon === 'check') {
        g.fillStyle(opts.accent, 1);
        g.fillRect(iconCx - 7, iconCy - 7, 14, 14);
        drawCheck(g, iconCx, iconCy, 4, PALETTE.bgVoid);
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
    const boxX = this.detailX + 10;
    const boxW = this.detailW >= WIDE_DETAIL_W ? 56 : 40;
    const boxH = CHAR_BOX_H;
    const colX = boxX + boxW + 8;
    const colW = this.detailX + this.detailW - 8 - colX;
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
    const name = this.domText.add(
      colX,
      PREVIEW_TOP + 6,
      t(item.nameKey),
      {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 12,
        bold: true,
        wordWrapWidth: colW,
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
    const boxX = this.detailX + 8;
    const boxW = this.detailW - 16;
    const boxH = 64;
    const groundY = PREVIEW_TOP + TRAIL_FLOOR_OFFSET;

    // The floor sits above the box's own bottom edge (LAUNCH's exhaust fires
    // downward and INTERFERENCE streaks need headroom), so everything under
    // it is painted as a solid platform rather than a tint — otherwise the
    // runner reads as hovering over an empty strip instead of standing on
    // ground, which is exactly how it looked before.
    const back = this.add.graphics();
    back.fillStyle(PALETTE.bgVoid, 1);
    back.fillRect(boxX, PREVIEW_TOP, boxW, boxH);
    back.fillStyle(PALETTE.metalMid, 1);
    back.fillRect(boxX, groundY, boxW, boxH - TRAIL_FLOOR_OFFSET);
    back.fillStyle(PALETTE.cyanDim, 1);
    back.fillRect(boxX, groundY, boxW, 2);
    back.lineStyle(1, PALETTE.metalMid, 1);
    back.strokeRect(boxX + 0.5, PREVIEW_TOP + 0.5, boxW - 1, boxH - 1);
    this.content.push(back);

    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    const fx = new TrailFx(this, item.id as TrailKind, this.detailX + this.detailW / 2, groundY);
    this.content.push({ destroy: () => fx.destroy() });

    const sprite = this.textures.exists(`${prefix}-idle-0`)
      ? this.add.sprite(this.detailX + this.detailW / 2, groundY, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(TRAIL_SPRITE_SCALE)
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
      x: this.detailX + this.detailW / 2,
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
    const leftX = this.detailX + 8;
    const rightX = this.detailX + this.detailW - 8 - boxW;

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
    cover.fillRect(this.detailX + 1, DETAIL_TOP + 19, this.detailW - 2, y - DETAIL_TOP - 19);
    cover.fillRect(this.detailX + 1, y + h, this.detailW - 2, bandBottom - (y + h));
    cover.fillRect(this.detailX + 1, y, x - this.detailX - 1, h);
    cover.fillRect(x + w, y, this.detailX + this.detailW - (x + w) - 1, h);
    cover.lineStyle(1, border, 0.6);
    cover.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.content.push(cover);
  }

  // ---- SYSTEM pack scene (real sampled lines) ----------------------------

  private buildSystemScene(item: ShopItem): void {
    const boxX = this.detailX + 8;
    const boxW = this.detailW - 16;
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

  /**
   * SYSTEM's column. `layout()` guarantees it room at every supported width,
   * so unlike the first pass it is never dropped: the whole point of the
   * screen is that something is watching you shop.
   */
  private buildRightColumn(category: ShopCategory, items: ShopItem[]): void {
    const colW = this.sysW;
    const systemH = category === 'character' ? 96 : DETAIL_H;
    const bg = this.add.rectangle(this.sysX, DETAIL_TOP, colW, systemH, PALETTE.system, 0.12).setOrigin(0, 0);
    const edge = this.add.rectangle(this.sysX, DETAIL_TOP, 2, systemH, PALETTE.system, 1).setOrigin(0, 0);
    this.content.push(bg, edge);

    this.pixel(this.sysX + 8, DETAIL_TOP + 10, 'SYSTEM', PALETTE.system, 1, 0, 0.5, true, { sizePx: 10 });

    // An uncapped label can grow past `systemH` into whatever sits below it
    // (the skin-collection box, for character), because SYSTEM's lines vary
    // in length. Capped to exactly the lines the box actually has room for.
    const sysLineSize = 11;
    const sysLineHeight = 1.5;
    const sysTextTop = DETAIL_TOP + 22;
    const sysMaxLines = Math.max(1, Math.floor((DETAIL_TOP + systemH - sysTextTop) / (sysLineSize * sysLineHeight)));
    this.systemLineLabel = this.pixel(this.sysX + 8, sysTextTop, this.systemLineText, PALETTE.systemLight, 1, 0, 0, true, {
      sizePx: sysLineSize,
      lineHeight: sysLineHeight,
      // SYSTEM's voice is prose, not a label: the mockup tracks its pixel-font
      // *labels* by 1-2px and gives these running lines none.
      letterSpacing: 0,
      wordWrapWidth: colW - 16,
      clampLines: sysMaxLines,
    });

    if (category !== 'character') return;

    const collY = DETAIL_TOP + systemH + 10;
    const collH = DETAIL_H - systemH - 10;
    const collBg = this.add.rectangle(this.sysX, collY, colW, collH, PALETTE.metalDark, 1).setOrigin(0, 0);
    this.content.push(collBg);

    const collLabel = this.pixel(this.sysX + 8, collY + 6, t('shopCollection'), PALETTE.labelMuted, 1, 0, 0, true, {
      sizePx: 9,
      wordWrapWidth: colW - 16,
    });

    // One chip per skin, sized to put the whole set on a single row when the
    // column allows it — a fixed 9px chip left the last one stranded alone on
    // a second row. The chip still has a floor, so a future longer catalogue
    // wraps onto tidy full rows instead of shrinking into invisibility.
    const chipGap = 3;
    const chipSpan = colW - 16;
    const chip = Math.max(5, Math.min(9, Math.floor((chipSpan - (items.length - 1) * chipGap) / items.length)));
    const perRow = Math.max(1, Math.floor((chipSpan + chipGap) / (chip + chipGap)));
    // Under however many lines the label actually took — a fixed offset held
    // only while it fit one line, and a wider technical face wraps it to two.
    const chipsTop = collY + 6 + Math.ceil(collLabel.height) + 5;
    const chips = this.add.graphics();
    items.forEach((item, i) => {
      const owned = this.isUnlocked(item) && this.isOwned(item);
      chips.fillStyle(owned ? skinColorsFor(item.id)?.visor ?? PALETTE.cyan : PALETTE.metalEdge, 1);
      chips.fillRect(
        this.sysX + 8 + (i % perRow) * (chip + chipGap),
        chipsTop + Math.floor(i / perRow) * (chip + chipGap),
        chip,
        chip,
      );
    });
    this.content.push(chips);

    // Directly under the chips it counts, not pinned to the bottom of the box
    // with a band of dead space between the two.
    const rows = Math.ceil(items.length / perRow);
    const countY = Math.min(chipsTop + rows * (chip + chipGap) + 8, collY + collH - 10);
    const ownedCount = items.filter((item) => this.isUnlocked(item) && this.isOwned(item)).length;
    this.pixel(this.sysX + 8, countY, `${ownedCount} / ${items.length}`, PALETTE.textMuted, 1, 0, 0.5, true);
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
    const offerW = this.detailX - 8 - GRID_X;
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
    // moves inside the card where it has the full width to breathe.
    const segW = offerW / items.length;
    items.forEach((it, i) => {
      const active = it.id === selected.id;
      const segX = offerX + i * segW;
      const g = this.add.graphics();
      g.fillStyle(active ? PALETTE.reward : PALETTE.goldDim, 1);
      g.fillRect(segX, offerY, segW, headerH);
      this.content.push(g);

      const segLabel = it.id === 'remove_ads' ? t('shopCategoryPremium') : t(it.nameKey);
      // "SYSTEM ACCESS" at the mockup's own size runs wider than one segment
      // of a two-way split card — shrink until it actually fits. A
      // `wordWrapWidth` floor underneath the shrink loop means an even
      // narrower canvas clips to one line instead of running into the
      // neighboring card, whatever the loop's own floor turns out to be.
      let segSize = 11;
      while (segSize > 6) {
        const probe = this.pixel(-1000, -1000, segLabel, PALETTE.white, 1, 0.5, 0.5, false, { sizePx: segSize });
        const fits = probe.width <= segW - 12;
        probe.destroy();
        if (fits) break;
        segSize -= 1;
      }
      this.pixel(
        segX + segW / 2,
        offerY + headerH / 2,
        segLabel,
        active ? PALETTE.bgVoid : PALETTE.labelMuted,
        1,
        0.5,
        0.5,
        true,
        { sizePx: segSize, wordWrapWidth: segW - 12, clampLines: 1 },
      );

      const zone = this.add
        .zone(segX + segW / 2, offerY + headerH / 2, segW, headerH)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        this.selectedByCategory.set('premium', it.id);
        this.renderCategory();
        commentOnShopItem(it.id, 'browse_premium');
      });
      this.content.push(zone);
    });

    // Headline row — the gold diamond plus the promise, at full card width.
    const bannerY = offerY + headerH + 14;
    const diamond = this.add.graphics();
    diamond.fillStyle(PALETTE.reward, 1);
    diamond.save();
    diamond.translateCanvas(offerX + 20, bannerY);
    diamond.rotateCanvas(Math.PI / 4);
    diamond.fillRect(-6, -6, 12, 12);
    diamond.restore();
    this.content.push(diamond);

    // Mockup: 15px. A narrow canvas shrinks the card, so the headline drops to
    // whatever size actually clears its own gold bar — measured, not chosen
    // from a width threshold, which left "БЕЗ РЕКЛАМЫ НАВСЕГДА" touching the
    // panel border on the narrowest canvas.
    const headline = selected.id === 'remove_ads' ? t('shopNoAdsForever') : t('shopSystemAccess');
    const headlineRoom = offerW - 34 - 10;
    const probe = this.domText.add(
      -1000,
      -1000,
      headline,
      { color: 'transparent', font: 'pixel', sizePx: 15, letterSpacing: 1, uppercase: true },
      0,
      0,
    );
    const headlineW = probe.width;
    probe.destroy();
    const headlineSize = headlineW <= headlineRoom ? 15 : Math.max(9, Math.floor((15 * headlineRoom) / headlineW));
    this.pixel(offerX + 34, bannerY, headline, PALETTE.reward, 2, 0, 0.5, true, { sizePx: headlineSize });

    const features =
      selected.id === 'remove_ads'
        ? [t('shopNoAdsFeature1'), t('shopNoAdsFeature2'), t('shopNoAdsFeature3')]
        : [t('shopBundleFeature'), t('shopSkinError404'), t('shopFxDataWipe'), t('shopPackCorrupted')];

    // The row pitch is divided out of the space that is actually left, so the
    // four-item SYSTEM ACCESS list fits whole instead of clipping to "…".
    const listTop = bannerY + 16;
    const noteY = offerY + offerH - 20;
    const rowH = Math.floor((noteY - 12 - listTop) / features.length);

    features.forEach((line, i) => {
      const y = listTop + rowH * i + rowH / 2;
      const check = this.add.graphics();
      check.fillStyle(PALETTE.patrolVisor, 1);
      check.fillRect(offerX + 12, y - 6, 12, 12);
      drawCheck(check, offerX + 18, y, 3.5, PALETTE.bgVoid);
      this.content.push(check);

      const text = this.domText.add(
        offerX + 30,
        y,
        line,
        {
          color: hexToCss(PALETTE.white),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 11,
          bold: true,
          wordWrapWidth: offerW - 42,
          clampLines: 2,
        },
        0,
        0.5,
      );
      this.content.push(text);
    });

    // The quiet honesty line, in the mockup's own "empty checkbox" style.
    const noteBox = this.add.graphics();
    noteBox.lineStyle(2, PALETTE.labelMuted, 1);
    noteBox.strokeRect(offerX + 13, noteY - 5, 10, 10);
    this.content.push(noteBox);
    const note = this.domText.add(
      offerX + 30,
      noteY,
      selected.id === 'remove_ads' ? t('shopNoAdsNote') : t(selected.descriptionKey),
      {
        color: hexToCss(PALETTE.labelMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 10,
        wordWrapWidth: offerW - 42,
        clampLines: 2,
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
    const x = this.detailX;
    const w = this.detailW;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.fillRect(x, top, w, h);
    g.lineStyle(1, PALETTE.goldDim, 1);
    g.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
    this.content.push(g);

    this.pixel(
      x + w / 2,
      top + 16,
      owned ? t('shopNoAdsOwned') : t('shopOneTimePurchase'),
      owned ? PALETTE.patrolVisor : PALETTE.labelMuted,
      1,
      0.5,
      0.5,
      true,
    );

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
    const colW = this.sysW;
    const bg = this.add.rectangle(this.sysX, top, colW, h, PALETTE.system, 0.12).setOrigin(0, 0);
    const edge = this.add.rectangle(this.sysX, top, 2, h, PALETTE.system, 1).setOrigin(0, 0);
    this.content.push(bg, edge);

    this.pixel(this.sysX + 8, top + 10, 'SYSTEM', PALETTE.system, 1, 0, 0.5, true, { sizePx: 10 });

    const sysLineSize = 11;
    const sysLineHeight = 1.5;
    const sysTextTop = top + 22;
    const sysMaxLines = Math.max(1, Math.floor((top + h - sysTextTop) / (sysLineSize * sysLineHeight)));
    this.systemLineLabel = this.pixel(this.sysX + 8, sysTextTop, this.systemLineText, PALETTE.systemLight, 1, 0, 0, true, {
      sizePx: sysLineSize,
      lineHeight: sysLineHeight,
      // SYSTEM's voice is prose, not a label: the mockup tracks its pixel-font
      // *labels* by 1-2px and gives these running lines none.
      letterSpacing: 0,
      wordWrapWidth: colW - 16,
      clampLines: sysMaxLines,
    });
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

  /**
   * The «получить кредиты» window, rebuilt against mockup 4d: free sources on
   * top, paid packs underneath. The free half lists only what this build
   * really pays out (`EARN_AMOUNTS`) — the mockup's daily-login streak and
   * daily-quest cards have no system behind them yet, so instead of three
   * cards two of which would be decoration, the row shows the rewarded ad,
   * per-level pay, and sector pay, the last with a real progress bar over the
   * player's own completed levels.
   */
  /**
   * Sets the topbar's title text and repositions the subtitle off its *new*
   * width — a subtitle pinned once at creation time went stale the moment
   * the title text (and therefore its rendered width) changed underneath it,
   * which is exactly what happened switching between "МАГАЗИН" and
   * "КРЕДИТЫ".
   */
  private retitle(title: string, subtitle: string): void {
    this.titleLabel.setText(title);
    this.subtitleLabel?.setPosition(40 + this.titleLabel.width, 15);
    this.subtitleLabel?.setText(subtitle);
  }

  private openGetCredits(): void {
    this.view = 'credits';
    this.setRailVisible(false);
    this.teardownLivePreview();
    this.clearContent();
    this.systemLineLabel = null;
    this.retitle(t('creditsTitle'), t('creditsSubtitle'));

    const x = 12;
    // Stops short of SYSTEM's column instead of running under it — the same
    // three-block split the showroom uses.
    const w = Math.min(456, this.sysX - 8 - x);

    this.buildBand(x, 38, w, t('creditsFreeBand'), PALETTE.cyan, PALETTE.cyanDim);

    const gap = 8;
    const cardW = Math.floor((w - gap * 2) / 3);
    this.buildAdCard(x, 64, cardW);
    this.buildLevelCard(x + cardW + gap, 64, cardW);
    this.buildSectorCard(x + (cardW + gap) * 2, 64, w - (cardW + gap) * 2);

    this.buildBand(x, 148, w, t('creditsPaidBand'), PALETTE.reward, PALETTE.goldDim, t('creditsCosmeticOnly'));

    const packGap = 4;
    const tileW = Math.floor((w - packGap * (CREDIT_PACKS.length - 1)) / CREDIT_PACKS.length);
    const best = this.bestValuePackId();
    CREDIT_PACKS.forEach((pack, i) => {
      this.buildPackTile(x + i * (tileW + packGap), 174, tileW, pack, pack.productId === best);
    });

    this.buildPremiumSystemColumn(38, 218);
  }

  /** Mockup 4d/4f/4g's section header: a 20px band with a 3px bar in the section's own color. */
  private buildBand(x: number, y: number, w: number, label: string, accent: number, fill: number, rightLabel?: string): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 0.35);
    g.fillRect(x, y, w, 20);
    g.fillStyle(accent, 1);
    g.fillRect(x, y, 3, 20);
    this.content.push(g);

    this.pixel(x + 11, y + 10, label, accent, 1, 0, 0.5, true);
    if (rightLabel === undefined) return;
    this.pixel(x + w - 8, y + 10, rightLabel, PALETTE.goldEdge, 1, 1, 0.5, true);
  }

  /** Shared body of an "earn" card: frame, glyph, title, one line of copy. */
  private buildEarnCard(x: number, y: number, w: number, border: number, title: string, desc: string): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(x, y, w, 74);
    g.lineStyle(1, border, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, 73);
    this.content.push(g);

    const name = this.domText.add(
      x + 30,
      y + 14,
      title,
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), sizePx: 12, bold: true },
      0,
      0.5,
    );
    this.content.push(name);

    const line = this.domText.add(
      x + 8,
      y + 26,
      desc,
      {
        color: hexToCss(PALETTE.textMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        wordWrapWidth: w - 16,
        clampLines: 1,
      },
      0,
      0,
    );
    this.content.push(line);
  }

  /** Coin + "+N", the shop's one money shape, at a card's bottom-left. */
  private buildEarnAmount(x: number, y: number, amount: number): void {
    this.coin(x + 6, y, 11, false);
    this.pixel(x + 15, y, `+${amount}`, PALETTE.reward, 2, 0, 0.5, true);
  }

  private buildAdCard(x: number, y: number, w: number): void {
    const disabled = AdsService.isAdsDisabled();
    this.buildEarnCard(x, y, w, disabled ? PALETTE.metalEdge : PALETTE.cyanDim, t('creditsAdCard'), t('creditsAdDesc'));

    const glyph = this.add.graphics();
    glyph.fillStyle(disabled ? PALETTE.textDisabled : PALETTE.cyan, 1);
    glyph.fillRect(x + 8, y + 8, 16, 12);
    glyph.fillStyle(PALETTE.bgVoid, 1);
    glyph.fillTriangle(x + 14, y + 11, x + 14, y + 17, x + 19, y + 14);
    this.content.push(glyph);

    this.buildEarnAmount(x + 8, y + 60, EARN_AMOUNTS.rewardedAd);

    this.pixel(
      x + w - 8,
      y + 44,
      disabled ? t('shopNoAdsOwned') : t('creditsAdReady'),
      disabled ? PALETTE.textDisabled : PALETTE.patrolVisor,
      1,
      1,
      0.5,
      true,
      { sizePx: 9, wordWrapWidth: w - 16, clampLines: 1 },
    );

    if (disabled) return;
    const zone = this.add.zone(x + w / 2, y + 37, w, 74).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      playSfx('uiClick');
      AdsService.requestRewarded((granted) => {
        if (!granted) return;
        CurrencyService.earnCredits(EARN_AMOUNTS.rewardedAd, 'rewarded_ad');
        this.refreshBalance();
        this.openGetCredits();
      });
    });
    this.content.push(zone);
  }

  private buildLevelCard(x: number, y: number, w: number): void {
    this.buildEarnCard(x, y, w, PALETTE.metalEdge, t('creditsLevelCard'), t('creditsLevelDesc'));

    const glyph = this.add.graphics();
    glyph.lineStyle(2, PALETTE.patrolVisor, 1);
    glyph.strokeRect(x + 9, y + 7, 14, 14);
    drawCheck(glyph, x + 16, y + 14, 3.5, PALETTE.patrolVisor);
    this.content.push(glyph);

    this.buildEarnAmount(x + 8, y + 60, EARN_AMOUNTS.levelComplete);

    this.pixel(
      x + w - 8,
      y + 44,
      `${t('creditsNoDeaths')} +${EARN_AMOUNTS.zeroDeaths}`,
      PALETTE.labelMuted,
      1,
      1,
      0.5,
      true,
      { sizePx: 9, wordWrapWidth: w - 16, clampLines: 1 },
    );
  }

  private buildSectorCard(x: number, y: number, w: number): void {
    this.buildEarnCard(x, y, w, PALETTE.systemDim, t('creditsSectorCard'), t('creditsSectorDesc'));

    const glyph = this.add.graphics();
    glyph.lineStyle(2, PALETTE.system, 1);
    glyph.strokeRect(x + 9, y + 7, 14, 14);
    glyph.fillStyle(PALETTE.system, 1);
    glyph.fillRect(x + 14, y + 12, 4, 4);
    this.content.push(glyph);

    // Real progress: how far the player is through the sector they are
    // currently working on, straight out of the save.
    const done = SaveService.getCompletedLevels().length % LEVELS_PER_SECTOR;
    const bar = this.add.graphics();
    bar.fillStyle(PALETTE.metalMid, 1);
    bar.fillRect(x + 8, y + 41, w - 16, 6);
    bar.fillStyle(PALETTE.system, 1);
    bar.fillRect(x + 8, y + 41, Math.round(((w - 16) * done) / LEVELS_PER_SECTOR), 6);
    this.content.push(bar);

    this.buildEarnAmount(x + 8, y + 60, EARN_AMOUNTS.sectorComplete);

    this.pixel(x + w - 8, y + 60, `${done} / ${LEVELS_PER_SECTOR}`, PALETTE.labelMuted, 1, 1, 0.5, true);
  }

  /**
   * The pack with the most credits per unit of real currency, or `null` while
   * the catalog is missing/partial. `priceValue` is the catalog's own numeric
   * field, so the badge states a fact rather than promoting a chosen tier.
   */
  private bestValuePackId(): string | null {
    let bestId: string | null = null;
    let bestRate = 0;
    for (const pack of CREDIT_PACKS) {
      const value = this.catalogValueById.get(pack.productId);
      if (value === undefined) return null;
      const rate = pack.credits / value;
      if (rate > bestRate) {
        bestRate = rate;
        bestId = pack.productId;
      }
    }
    return bestId;
  }

  private buildPackTile(x: number, y: number, w: number, pack: (typeof CREDIT_PACKS)[number], best: boolean): void {
    const h = 82;
    const price = this.catalogPricesById.get(pack.productId);
    const buyable = price !== undefined;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(best ? 2 : 1, best ? PALETTE.reward : PALETTE.goldDim, 1);
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    this.content.push(g);

    // Coin stack — one coin per tier, so the tiles read as a ladder before a
    // single number is parsed.
    const coins = Math.min(3, 1 + Math.floor(CREDIT_PACKS.indexOf(pack) / 2));
    for (let i = 0; i < coins; i++) this.coin(x + w / 2 - (coins - 1) * 7 + i * 14, y + 18, 11, false);

    this.pixel(x + w / 2, y + 34, String(pack.credits), PALETTE.reward, 2, 0.5, 0.5, true);
    this.pixel(x + w / 2, y + 48, t('creditsUnits'), PALETTE.labelMuted, 1, 0.5, 0.5, true);

    const btnW = w - 16;
    const btnX = x + 8;
    const btnY = y + h - 22;
    const btn = this.add.graphics();
    const paint = (hover: boolean): void => {
      btn.clear();
      if (best && buyable) btn.fillStyle(hover ? PALETTE.goldLight : PALETTE.reward, 1);
      else btn.fillStyle(hover && buyable ? PALETTE.metalEdge : PALETTE.metalMid, 1);
      btn.fillRect(btnX, btnY, btnW, 18);
      btn.lineStyle(1, buyable ? PALETTE.goldDim : PALETTE.metalEdge, 1);
      btn.strokeRect(btnX + 0.5, btnY + 0.5, btnW - 1, 17);
    };
    paint(false);
    this.content.push(btn);

    const priceLabel = this.domText.add(
      btnX + btnW / 2,
      btnY + 9,
      price ?? (this.catalogLoaded ? t('creditsNoPrice') : '…'),
      {
        color: hexToCss(best && buyable ? PALETTE.bgVoid : buyable ? PALETTE.reward : PALETTE.textDisabled),
        strokeColor: hexToCss(best && buyable ? PALETTE.reward : PALETTE.outline),
        // A narrow canvas splits the same row into five tiles; the price is
        // the one label that must never spill out of its own button.
        sizePx: btnW >= 76 ? 12 : 10,
        bold: true,
      },
      0.5,
      0.5,
    );
    this.content.push(priceLabel);

    if (best) {
      const flagW = Math.min(w - 2, 50);
      const flag = this.add.graphics();
      flag.fillStyle(PALETTE.reward, 1);
      flag.fillRect(x + 1, y + 1, flagW, 11);
      this.content.push(flag);
      this.pixel(x + 1 + flagW / 2, y + 7, t('creditsBestValue'), PALETTE.bgVoid, 1, 0.5, 0.5, true);
    }

    if (!buyable) return;
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => paint(true));
    zone.on('pointerout', () => paint(false));
    zone.on('pointerup', () => {
      playSfx('uiClick');
      void this.handleBuyCreditPack(pack.productId);
    });
    this.content.push(zone);
  }

  private backToMain(): void {
    this.view = 'main';
    this.retitle(t('shop'), t('shopTitle'));
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
