import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { COMMAND_COLUMN_CENTER_X, MENU_LAYOUT, MENU_TILES, systemLineWidth } from '@/config/menuLayout';
import { SaveService } from '@/services/SaveService';
import { CurrencyService } from '@/services/CurrencyService';
import { InventoryService } from '@/services/InventoryService';
import { YandexGamesService } from '@/services/YandexGamesService';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';
import { EventBus } from '@/core/EventBus';
import { commentOnMenu, type MenuCommentKind } from '@/data/dialogues/menu';
import { PixelLabel } from '@/ui/PixelLabel';
import { MenuTile, type MenuTileLabelState } from '@/ui/MenuTile';
import { DomTextOverlay, type DomTextHandle } from '@/ui/DomTextOverlay';
import { fadeIn } from '@/ui/SceneFade';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { t } from '@/i18n/ui';

/**
 * "Showcase + command column" (design spec 1a).
 *
 * The menu it replaced was five same-sized text buttons in a centred column,
 * which handed the player the job of working out which one mattered. This
 * one answers that before anything is read: PLAY is ~4x the area of any
 * other control, the only light shape on a dark field, the only one with a
 * triangle, and the only thing moving. Everything else is one clear step
 * down, and the technical SYSTEM readouts are a step below that, in violet,
 * visibly not buttons.
 *
 * The left panel is doing real work too — the android the player owns,
 * standing lit on a pedestal above a CHANGE SKIN button and a credit
 * balance. That's the whole motivation for the shop stated in one glance,
 * where the old menu hid the shop in a corner and never showed the
 * character at all.
 *
 * Layout constants live in `config/menuLayout.ts` and are covered by
 * `tests/menu-layout.test.ts`, which enforces what makes this width-proof:
 * every control fits inside the 480px safe zone, so widening the canvas only
 * ever adds atmosphere on the right.
 */
export class MainMenuScene extends Phaser.Scene {
  private domText!: DomTextOverlay;
  private systemLineLabel?: PixelLabel;
  /** Which controls SYSTEM has already remarked on — one line per control per visit, so it never nags. */
  private commentedOn = new Set<MenuCommentKind>();
  private commentHandler = (payload: { text: string; category: string }): void => {
    if (payload.category !== 'menu') return;
    this.systemLineLabel?.setPixelText(payload.text);
  };

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    fadeIn(this);

    const { width, height } = this.scale;

    // Below `ShopScene`'s layer: both scenes run at once while an overlay is
    // open, and DOM text can't be covered by a canvas-drawn dim backdrop.
    this.domText = new DomTextOverlay(this, 10);
    this.commentedOn.clear();

    this.buildBackground(width, height);
    this.buildServerRack(width);
    this.buildShowcase();
    this.buildLogo();
    this.buildSystemReadout(width);
    this.buildSystemLine(width);
    this.buildTiles();

    EventBus.on('system:comment', this.commentHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('system:comment', this.commentHandler);
      this.domText.destroy();
    });

    // Late enough that the greeting lands after the screen has settled rather
    // than competing with the fade-in.
    this.time.delayedCall(600, () => commentOnMenu('greeting'));

    // The menu is now fully built and interactive — this is the moment
    // CLAUDE.md #8 means by "LoadingAPI.ready", not a generic "boot done"
    // signal. Idempotent inside the service, so returning to this scene
    // later doesn't re-fire it.
    YandexGamesService.notifyLoadingReady();
  }

  /**
   * Overlays (`scene.launch`) run alongside this scene rather than pausing
   * it, so its DOM labels would otherwise float above the overlay's panel —
   * the one thing a canvas-drawn dim backdrop cannot cover — and, worse, its
   * own buttons (PLAY included) stay live underneath: the backdrop only
   * paints over them, it doesn't stop this scene's input plugin from still
   * hitting them. Both are hidden/disabled for the duration and restored
   * when the overlay shuts itself down.
   */
  private openOverlay(key: string): void {
    this.domText.setLayerVisible(false);
    this.input.enabled = false;
    this.scene.launch(key);
    this.scene.get(key).events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.domText.setLayerVisible(true);
      this.input.enabled = true;
    });
  }

  private buildBackground(width: number, height: number): void {
    buildRadialGridBackdrop(this, width, height, 'menu-backdrop', 0.78, 0.4);

    // Starts past the showcase panel so it reads as sweeping the open space,
    // not passing over the character.
    const scanX = MENU_LAYOUT.showcase.w;
    const scan = this.add.graphics().setDepth(-8);
    scan.fillStyle(PALETTE.cyan, 0.35);
    scan.fillRect(scanX, 0, width - scanX, 1);
    this.tweens.add({
      targets: scan,
      y: { from: -20, to: height + 20 },
      duration: 6000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  /** Pure atmosphere in the space a wide canvas adds — it holds nothing the player needs, so it simply doesn't exist below its declared width. */
  private buildServerRack(width: number): void {
    const rack = MENU_LAYOUT.serverRack;
    if (width < rack.minWidth) return;

    const g = this.add.graphics().setDepth(-7);
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(rack.x, rack.y, rack.w, rack.h);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.strokeRect(rack.x + 0.5, rack.y + 0.5, rack.w - 1, rack.h - 1);

    const bars: Array<[number, number]> = [
      [80, PALETTE.metalMid],
      [56, PALETTE.cyanDim],
      [72, PALETTE.metalMid],
      [40, PALETTE.systemDim],
      [64, PALETTE.metalMid],
      [48, PALETTE.metalMid],
      [76, PALETTE.cyanDim],
      [32, PALETTE.metalMid],
      [60, PALETTE.metalMid],
    ];
    bars.forEach(([barWidth, color], i) => {
      g.fillStyle(color, 1);
      g.fillRect(rack.x + 8, rack.y + 8 + i * 12, barWidth, 6);
    });
  }

  private buildShowcase(): void {
    const panel = MENU_LAYOUT.showcase;
    const header = MENU_LAYOUT.showcaseHeader;
    const g = this.add.graphics().setDepth(-6);

    g.fillGradientStyle(PALETTE.bgGraphite, PALETTE.bgGraphite, PALETTE.metalDark, PALETTE.metalDark, 1);
    g.fillRect(panel.x, panel.y, panel.w, panel.h);
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(panel.x + panel.w - 1, panel.y, 1, panel.h);

    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(header.x, header.y, header.w, header.h);
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(header.x, header.y + header.h - 1, header.w, 1);

    const unit = new PixelLabel(this, header.w / 2, header.h / 2, t('menuUnit'), {
      color: hexToCss(PALETTE.cyan),
      scale: 1,
    });
    unit.setOrigin(0.5, 0.5);

    this.buildSpotlight(g);
    this.buildCharacter();
    this.buildPedestal(g);
    this.buildChangeSkinTile();
    this.buildCreditsCounter();
  }

  /** A cone of light narrowing upward, as stacked slices — `Graphics` has one alpha per fill, so a real alpha ramp has to be built out of steps. */
  private buildSpotlight(g: Phaser.GameObjects.Graphics): void {
    const topY = 30;
    const bottomY = 200;
    const slices = 14;
    const topLeft = 57;
    const topRight = 93;
    const bottomLeft = 35;
    const bottomRight = 115;

    for (let i = 0; i < slices; i++) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;
      const y0 = topY + (bottomY - topY) * t0;
      const y1 = topY + (bottomY - topY) * t1;
      const l0 = topLeft + (bottomLeft - topLeft) * t0;
      const r0 = topRight + (bottomRight - topRight) * t0;
      const l1 = topLeft + (bottomLeft - topLeft) * t1;
      const r1 = topRight + (bottomRight - topRight) * t1;

      g.fillStyle(PALETTE.cyan, 0.1 * (1 - t0));
      g.beginPath();
      g.moveTo(l0, y0);
      g.lineTo(r0, y0);
      g.lineTo(r1, y1);
      g.lineTo(l1, y1);
      g.closePath();
      g.fillPath();
    }
  }

  private buildCharacter(): void {
    const { cx, footY, scale } = MENU_LAYOUT.character;
    // Shows the skin the player actually owns and has equipped — the reason
    // CHANGE SKIN and the credit balance sit directly beneath it.
    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    const sprite = this.add.sprite(cx, footY, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(scale);
    sprite.play(`${prefix}-idle`);
  }

  private buildPedestal(g: Phaser.GameObjects.Graphics): void {
    const p = MENU_LAYOUT.pedestal;
    g.fillStyle(PALETTE.cyan, 0.22);
    g.fillEllipse(MENU_LAYOUT.character.cx, p.y + 5, 70, 14);
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(p.x, p.y, p.w, p.h);
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(p.x + 6, p.y + p.h, p.w - 12, 5);
  }

  private buildChangeSkinTile(): void {
    const box = MENU_TILES.changeSkin;
    // Origin (0, 0.5): the tile hands back a left edge and a vertical
    // centre, so the label has to be centred on that Y rather than hung
    // below it.
    const label = this.domText.add(0, 0, t('menuChangeSkin'), {
      color: hexToCss(PALETTE.white),
      sizePx: 9,
      bold: true,
      uppercase: true,
    }, 0, 0.5);

    // Content is centred here rather than left-aligned, so the tile needs the
    // label's width — which only the DOM knows.
    const contentWidth = 8 + 5 + label.width;
    const tile: MenuTile = new MenuTile(this, {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      variant: 'compact',
      icon: 'skin',
      accent: PALETTE.metalEdge,
      hoverAccent: PALETTE.system,
      iconAccent: PALETTE.system,
      onClick: () => this.openOverlay('ShopScene'),
      onLabelState: (state) => this.syncLabel(label, tile, state, 'skin'),
      contentWidth,
    });
    label.setPosition(tile.labelX, tile.labelY);
  }

  private buildCreditsCounter(): void {
    const box = MENU_LAYOUT.creditsCounter;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgGraphite, 1);
    g.fillRect(box.x, box.y, box.w, box.h);
    g.lineStyle(1, PALETTE.goldDim, 1);
    g.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);

    const cy = box.y + box.h / 2;
    const coinX = box.x + 16;
    g.fillStyle(PALETTE.reward, 1);
    g.fillCircle(coinX, cy, 6);
    g.lineStyle(1, PALETTE.goldEdge, 1);
    g.strokeCircle(coinX, cy, 6);
    g.fillStyle(PALETTE.goldEdge, 1);
    g.fillCircle(coinX, cy, 2);

    // Digits stay in the bitmap font: numerals are exactly where it's
    // unambiguous, and they carry the machine-readout feel the panel wants.
    const balance = new PixelLabel(this, coinX + 12, cy, String(CurrencyService.getBalance()), {
      color: hexToCss(PALETTE.reward),
      scale: 2,
    });
    balance.setOrigin(0, 0.5);
  }

  private buildLogo(): void {
    const { y } = MENU_LAYOUT.logo;
    // Centred over the PLAY+grid block below it, not hung off its own left
    // edge — the block reads as one composed unit this way, logo included.
    const title = new PixelLabel(this, COMMAND_COLUMN_CENTER_X, y, 'IT KNOWS', {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.systemDim),
      scale: 4,
    });
    title.setOrigin(0.5, 0);
    title.postFX.addGlow(PALETTE.cyan, 0, 0, false, 0.3, 6);
    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 500 });
  }

  private buildSystemReadout(width: number): void {
    const status = MENU_LAYOUT.systemStatus;
    const right = width - status.rightInset;

    const label = new PixelLabel(this, right, status.y, 'SYSTEM ONLINE', {
      color: hexToCss(PALETTE.cyan),
      scale: 1,
    });
    label.setOrigin(1, 0);

    const dot = this.add.graphics();
    dot.fillStyle(PALETTE.cyan, 1);
    dot.fillRect(right - label.width - 10, status.y + 2, 5, 5);
    this.tweens.add({ targets: dot, alpha: { from: 1, to: 0.15 }, duration: 800, yoyo: true, repeat: -1 });

    const version = MENU_LAYOUT.version;
    const suffix = width >= MENU_LAYOUT.systemLine.minWidth ? ` · ${t('menuItWatches')}` : '';
    const versionLabel = new PixelLabel(this, right, version.y, `v${__APP_VERSION__}${suffix}`, {
      color: hexToCss(PALETTE.systemMuted),
      scale: 1,
    });
    versionLabel.setOrigin(1, 0);
  }

  /** SYSTEM's spoken line. Right-anchored and only on a wide canvas — it's commentary, never something the player has to read to proceed. */
  private buildSystemLine(width: number): void {
    const slot = MENU_LAYOUT.systemLine;
    const w = systemLineWidth(width);
    if (w === 0) return;

    const x = width - slot.rightInset - w;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.systemDim, 0.25);
    g.fillRect(x, slot.y, w, slot.h);
    g.fillStyle(PALETTE.system, 1);
    g.fillRect(x, slot.y, 2, slot.h);

    this.systemLineLabel = new PixelLabel(this, x + 8, slot.y + slot.h / 2, '', {
      color: hexToCss(PALETTE.systemLight),
      scale: 1,
      wordWrapWidth: w - 16,
    });
    this.systemLineLabel.setOrigin(0, 0.5);
  }

  private buildTiles(): void {
    this.addTile('play', MENU_TILES.play, {
      variant: 'primary',
      icon: 'play',
      accent: PALETTE.white,
      hoverAccent: PALETTE.white,
      iconAccent: PALETTE.bgVoid,
      labelSize: 30,
      labelColor: PALETTE.bgVoid,
      onClick: () => {
        this.scene.start('GameplayScene', { levelId: SaveService.getResumeLevelId(), entryTransition: true });
      },
    });

    this.addTile('levels', MENU_TILES.levels, {
      variant: 'secondary',
      icon: 'levels',
      accent: PALETTE.metalEdge,
      hoverAccent: PALETTE.cyan,
      iconAccent: PALETTE.cyan,
      onClick: () => this.openOverlay('LevelSelectScene'),
    });

    this.addTile('shop', MENU_TILES.shop, {
      variant: 'secondary',
      icon: 'shop',
      accent: PALETTE.goldDim,
      hoverAccent: PALETTE.reward,
      iconAccent: PALETTE.reward,
      onClick: () => this.openOverlay('ShopScene'),
    });

    this.addTile('help', MENU_TILES.help, {
      variant: 'secondary',
      icon: 'help',
      accent: PALETTE.systemDim,
      hoverAccent: PALETTE.system,
      iconAccent: PALETTE.system,
      onClick: () => this.openOverlay('HowToPlayScene'),
    });

    this.addTile('settings', MENU_TILES.settings, {
      variant: 'secondary',
      icon: 'settings',
      accent: PALETTE.metalEdge,
      hoverAccent: PALETTE.cyan,
      iconAccent: PALETTE.cyan,
      onClick: () => this.openOverlay('SettingsScene'),
    });
  }

  private addTile(
    key: 'play' | 'levels' | 'shop' | 'help' | 'settings',
    box: { x: number; y: number; w: number; h: number },
    spec: {
      variant: 'primary' | 'secondary';
      icon: 'play' | 'levels' | 'shop' | 'help' | 'settings';
      accent: number;
      hoverAccent: number;
      iconAccent: number;
      labelSize?: number;
      labelColor?: number;
      onClick: () => void;
    },
  ): void {
    const textKey = key === 'help' ? 'howToPlay' : key;
    const label = this.domText.add(0, 0, t(textKey), {
      color: hexToCss(spec.labelColor ?? PALETTE.white),
      sizePx: spec.labelSize ?? 13,
      bold: true,
      uppercase: true,
    }, 0, 0.5);

    // PLAY is the one control SYSTEM stays quiet about — it's the path the
    // player came for, and commentary there would only slow it down.
    const commentKind = key === 'play' ? undefined : (key as MenuCommentKind);

    // PLAY is wide enough (spans the whole grid, `menuLayout.ts`) that
    // left-aligning its icon+label at the primary variant's fixed 22+16
    // inset left a lopsided gap of empty cyan on the right — centred like
    // `buildChangeSkinTile`'s compact tile, for the same reason: only the
    // DOM knows the label's actual width. The grid tiles stay left-aligned;
    // at 120px wide with a short word, the fixed inset already reads fine.
    const contentWidth = spec.variant === 'primary' ? 22 + 16 + label.width : undefined;

    const tile: MenuTile = new MenuTile(this, {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      variant: spec.variant,
      icon: spec.icon,
      accent: spec.accent,
      hoverAccent: spec.hoverAccent,
      iconAccent: spec.iconAccent,
      onClick: spec.onClick,
      onLabelState: (state) => this.syncLabel(label, tile, state, commentKind),
      ...(contentWidth !== undefined ? { contentWidth } : {}),
    });
    label.setPosition(tile.labelX, tile.labelY);

    if (spec.variant === 'primary') this.addPlayPulse(tile);
  }

  /**
   * The single moving element in the menu, which is why a child's eye lands
   * on the right control without reading anything. A breathing glow rather
   * than a scale tween: `roundPixels` snaps the tile's vector face and its
   * DOM label to screen pixels independently, so a continuously-changing
   * fractional scale drifts them apart. A halo resizes nothing.
   */
  private addPlayPulse(tile: MenuTile): void {
    const glow = tile.postFX.addGlow(PALETTE.cyan, 1, 0, false, 0.4, 6);
    this.tweens.add({
      targets: glow,
      outerStrength: { from: 1, to: 4 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private syncLabel(
    label: DomTextHandle,
    tile: MenuTile,
    state: MenuTileLabelState,
    commentKind?: MenuCommentKind,
  ): void {
    label.setColor(hexToCss(state.color));
    // Keeps the text sinking with the face on press, so the button reads as
    // one object rather than a label sitting on a moving panel.
    label.setPosition(tile.labelX, tile.labelY + state.offsetY);

    if (state.hover && commentKind && !this.commentedOn.has(commentKind)) {
      this.commentedOn.add(commentKind);
      commentOnMenu(commentKind);
    }
  }
}
