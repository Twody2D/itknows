import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import type { DomTextHandle, DomTextOptions } from '@/ui/DomTextOverlay';
import { buildScreenTopbar, attachEscape } from '@/ui/ScreenChrome';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { playSfx } from '@/audio/SfxManager';
import { LEVELS_PER_SECTOR, SECTOR_COUNT, levelIdFor, sectorIdOf, sectorName, sectorNumberOf } from '@/gameplay/sectors';
import { SaveService } from '@/services/SaveService';
import { InventoryService } from '@/services/InventoryService';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';
import { levelSelectComment } from '@/data/dialogues/levelSelect';
import { currentChallengeTimeMs, getDailyChallenge } from '@/gameplay/DailyChallenge';
import { DAILY_LIVES } from '@/services/SaveService';
import { rebuildOnResize } from '@/ui/relayout';
import { BAR_W, TITLE_MAX_PX, TITLE_X, sectorHeaderLayout } from '@/config/sectorHeaderLayout';
import { STAR_PX, drawStarRow, starRowWidth } from '@/ui/StarRow';
import { MAX_STARS, canPlayLevel, starGateFor } from '@/gameplay/stars';
import { addCheckGlyph, addChevronGlyph, addDiamondGlyph, addPlayTriangle } from '@/ui/glyphs';

/**
 * The level map, rebuilt against Claude Design mockup 4e: one sector at a
 * time as a route of small cards, with the level the player is actually on
 * blown up into a single lit PLAY card, instead of six identical numbered
 * buttons.
 *
 * The mockup's middle row is filled at last. It drew three chips per tile,
 * counting collectibles this game does not have, so for a long time the tile
 * carried only its number and its best time and the row sat empty. Stars
 * (`gameplay/stars.ts`) are what the save can really count, and they go
 * exactly where the chips were.
 *
 * The padlocks are real (`canPlayLevel`) — a locked tile gets no hit zone at
 * all, so it cannot be tapped past — and they name which of the two locks is
 * shut: the level before it, or the sector's star gate.
 */
const SMALL_SLOTS: [number, number][] = [
  [44, 60],
  [130, 60],
  [216, 60],
  [130, 150],
  [216, 150],
];
const SMALL_W = 76;
const BIG = { x: 298, y: 48, w: 140, h: 98 };
const SHOWCASE = { x: 44, y: 150, w: 76, h: 88 };
/**
 * Widened from the mockup's 118 to line up with the PLAY card directly above
 * it — which is also the width at which "ИСПЫТАНИЕ ДНЯ" fits the title row
 * whole at a size a seven-year-old can read. At 118 the full phrase had to be
 * shrunk past that floor and gave way to the short form even on a wide canvas.
 */
const DAILY = { x: 298, y: 158, w: BIG.w, h: 62 };
/**
 * The SYSTEM column's stats box. Grown from the mockup's 80 to carry the
 * sector's star count under the best time; it ends at 254 on a 270-tall
 * canvas, which is the same bottom margin the map's own tiles keep.
 */
const STATS_BOX_H = 96;
/** The mockup's own content zone: 12..468, with SYSTEM's column at 492. */
const MAP_X = 12;
const MAP_W = 456;
const SYS_MIN_W = 96;

export class LevelSelectScene extends Phaser.Scene {
  private domText!: DomTextOverlay;
  private sector = 1;
  private items: Array<{ destroy(): void }> = [];
  /**
   * Horizontal squeeze of the mockup's 456px map. Below its 620px canvas the
   * map narrows so SYSTEM's column still fits beside it — the owner's rule
   * for the shop, applied here too. Vertical positions never move: the canvas
   * is 270px tall at every width.
   */
  private k = 1;
  private sysX = 492;
  private sysW = 116;

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    rebuildOnResize(this);
    const { width, height } = this.scale;

    // The scene instance is reused across `scene.launch`, so anything held
    // from a previous run points at destroyed objects.
    this.items = [];

    buildRadialGridBackdrop(this, width, height, 'levels-backdrop', 0.55, 0.3);
    fadeIn(this);

    this.domText = new DomTextOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    // Open on the sector the player is actually in, not always the first.
    this.sector = Math.min(SECTOR_COUNT, Math.floor(SaveService.getCompletedLevels().length / LEVELS_PER_SECTOR) + 1);

    const mapW = Math.min(MAP_W, width - 8 - SYS_MIN_W - 8 - MAP_X);
    this.k = mapW / MAP_W;
    this.sysX = MAP_X + mapW + 8;
    this.sysW = width - 8 - this.sysX;

    buildScreenTopbar(this, this.domText, {
      title: t('levels'),
      accent: PALETTE.cyan,
      onBack: () => this.scene.stop(),
    });
    attachEscape(this, () => this.scene.stop());

    this.renderSector();
  }

  // ---- helpers -----------------------------------------------------------

  /** Mockup 4e's technical type: the pixel face on the DOM layer, same ladder the shop uses. */
  private pixel(
    x: number,
    y: number,
    text: string,
    color: number,
    step: number,
    originX = 0,
    originY = 0.5,
    wrapWidth?: number,
    extra?: Partial<DomTextOptions>,
  ): DomTextHandle {
    const sizePx = step >= 4 ? 30 : step === 3 ? 22 : step === 2 ? 16 : 11;
    const label = this.domText.add(
      x,
      y,
      text,
      {
        color: hexToCss(color),
        font: 'pixel',
        sizePx,
        letterSpacing: 1,
        uppercase: true,
        ...(wrapWidth === undefined ? {} : { wordWrapWidth: wrapWidth }),
        ...extra,
      },
      originX,
      originY,
    );
    this.items.push(label);
    return label;
  }

  /** Mockup X -> real X. */
  private sx(x: number): number {
    return Math.round(MAP_X + (x - MAP_X) * this.k);
  }

  /** Mockup width -> real width. */
  private sw(w: number): number {
    return Math.round(w * this.k);
  }

  /** Mockup type size -> real size, so a squeezed card's label squeezes with it. */
  private st(sizePx: number): number {
    return Math.max(8, Math.round(sizePx * (0.55 + 0.45 * this.k)));
  }

  /**
   * The biggest size (at most `max`) at which `text` really fits `available`
   * virtual px, measured off a throwaway label in the same style rather than
   * estimated from character count. The estimate this replaces assumed a
   * flat ~0.62em per glyph, which understates uppercase Cyrillic in Rubik's
   * heavy weight — that is what let "ИСПЫТАНИЕ ДНЯ" run past the daily
   * card's own border. Text width is linear in font size, so one measurement
   * gives the answer outright; no search loop.
   */
  private fit(text: string, available: number, max: number, style: Partial<DomTextOptions> = {}): number {
    const probe = this.domText.add(
      -1000,
      -1000,
      text,
      { color: 'transparent', sizePx: max, uppercase: true, ...style },
      0,
      0,
    );
    const measured = probe.width;
    probe.destroy();
    if (measured <= 0 || measured <= available) return max;
    return Math.max(8, Math.floor((max * available) / measured));
  }

  private clear(): void {
    for (const item of this.items) item.destroy();
    this.items = [];
  }

  private levelsOfSector(): string[] {
    return Array.from({ length: LEVELS_PER_SECTOR }, (_, i) => levelIdFor(this.sector, i + 1));
  }

  /** The level the player is on: the first one in this sector they have not cleared, or the last if the sector is done. */
  private currentIndex(levels: string[]): number {
    const index = levels.findIndex((id) => !SaveService.isCompleted(id));
    return index === -1 ? levels.length - 1 : index;
  }

  private clock(ms: number): string {
    const total = Math.round(ms / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private bestTimeText(levelId: string): string | null {
    const bestMs = SaveService.getLevelBestMs(levelId);
    return bestMs === null ? null : this.clock(bestMs);
  }

  private startLevel(levelId: string): void {
    this.scene.stop('MainMenuScene');
    this.scene.stop();
    this.scene.start('GameplayScene', { levelId, entryTransition: true });
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): Phaser.GameObjects.Zone {
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      playSfx('uiClick');
      onClick();
    });
    this.items.push(zone);
    return zone;
  }

  private renderSector(): void {
    this.clear();

    const levels = this.levelsOfSector();
    const cleared = levels.filter((id) => SaveService.isCompleted(id)).length;
    const currentIndex = this.currentIndex(levels);

    this.buildSectorHeader(cleared, levels.length);
    this.buildArrows();
    this.buildRoute(cleared, levels.length);

    let slot = 0;
    levels.forEach((levelId, i) => {
      if (i === currentIndex) {
        this.buildCurrentCard(levelId, i + 1, cleared === levels.length);
        return;
      }
      const [x, y] = SMALL_SLOTS[slot++] ?? SMALL_SLOTS[SMALL_SLOTS.length - 1]!;
      this.buildSmallCard(levelId, i + 1, x, y, y === 60 ? 74 : 70);
    });

    this.buildShowcase();
    this.buildDailyCard();
    this.buildSystemColumn(cleared, levels.length);
  }

  private buildSectorHeader(cleared: number, total: number): void {
    const counter = `${cleared} / ${total}`;
    const counterStyle: DomTextOptions = {
      color: hexToCss(PALETTE.cyan),
      font: 'pixel',
      letterSpacing: 1,
      uppercase: true,
      sizePx: 11,
    };

    // The progress block goes flush right and the title takes what is left —
    // see `config/sectorHeaderLayout.ts` for why, and for what it replaced.
    const { barX, counterX, titleMaxWidth } = sectorHeaderLayout(
      this.scale.width,
      this.domText.measureWidth(counter, counterStyle),
    );

    // SIZED AGAINST THE BAR, not set at a fixed 10px and hoped for. Every
    // other screen in the game already fits its type to the box it was given
    // (`SectorCompleteScene`'s SYSTEM column, the shop's legend); this header
    // never did, and it is about to get a star counter beside it as well.
    const title = `${t('levelSelectSector')} ${String(this.sector).padStart(2, '0')} · ${sectorName(this.sector)}`;
    const titleStyle: DomTextOptions = {
      color: hexToCss(PALETTE.system),
      font: 'pixel',
      letterSpacing: 1,
      uppercase: true,
    };
    const sizePx = this.domText.lineFitSize(title, titleStyle, titleMaxWidth, TITLE_MAX_PX);
    this.pixel(TITLE_X, 15, title, PALETTE.system, 1, 0, 0.5, undefined, { sizePx });

    const bar = this.add.graphics();
    bar.fillStyle(PALETTE.metalMid, 1);
    bar.fillRect(barX, 11, BAR_W, 8);
    bar.fillStyle(PALETTE.cyan, 1);
    bar.fillRect(barX, 11, Math.round((BAR_W * cleared) / total), 8);
    this.items.push(bar);
    this.pixel(counterX, 15, counter, PALETTE.cyan, 1, 0, 0.5, undefined, { sizePx: 11 });
  }

  private buildArrows(): void {
    const draw = (mx: number, forward: boolean): void => {
      const x = this.sx(mx);
      const w = Math.max(16, this.sw(22));
      const cx = x + w / 2;
      const g = this.add.graphics();
      this.items.push(g);
      // Only the arrow head is a diagonal, so only it goes on the DOM layer;
      // the column behind it is axis-aligned and stays on the canvas.
      const head = addChevronGlyph(this.domText, cx, 138, 11, hexToCss(PALETTE.cyan), forward ? 'right' : 'left');
      this.items.push(head);
      const paint = (hover: boolean): void => {
        g.clear();
        g.fillStyle(hover ? PALETTE.panelHover : PALETTE.metalDark, 1);
        g.fillRect(x, 38, w, 200);
        g.lineStyle(1, hover ? PALETTE.cyan : PALETTE.metalEdge, 1);
        g.strokeRect(x + 0.5, 38.5, w - 1, 199);
        head.setColor(hexToCss(hover ? PALETTE.white : PALETTE.cyan));
      };
      paint(false);

      const zone = this.hit(x, 38, w, 200, () => {
        this.sector = Phaser.Math.Wrap(this.sector - 1 + (forward ? 1 : -1), 0, SECTOR_COUNT) + 1;
        this.renderSector();
      });
      zone.on('pointerover', () => paint(true));
      zone.on('pointerout', () => paint(false));
    };

    draw(12, false);
    draw(446, true);
  }

  private buildRoute(cleared: number, total: number): void {
    const x = this.sx(64);
    const w = this.sw(352);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(x, 96, w, 3);
    g.fillRect(x, 184, w, 3);
    g.fillStyle(PALETTE.cyan, 1);
    g.fillRect(x, 96, Math.round((w * cleared) / total), 3);
    this.items.push(g);
  }

  private buildSmallCard(levelId: string, number: number, mx: number, y: number, h: number): void {
    const done = SaveService.isCompleted(levelId);
    const totalStars = SaveService.getTotalStars();
    const unlocked = canPlayLevel(levelId, (id: string) => SaveService.isCompleted(id), totalStars);
    const best = done ? this.bestTimeText(levelId) : null;
    const x = this.sx(mx);
    const w = this.sw(SMALL_W);

    const g = this.add.graphics();
    g.fillStyle(done ? PALETTE.metalDark : PALETTE.bgGraphite, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, done ? PALETTE.cyanDim : PALETTE.metalMid, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.items.push(g);

    if (!unlocked) {
      // Two different reasons a tile can be shut, and the player has to be
      // told which: the level before it is unfinished, or the sector asks for
      // stars they have not collected (`gameplay/stars.ts`). A padlock that
      // means both means neither.
      const gate = starGateFor(sectorNumberOf(levelId));
      this.buildLockedTile(x, y, w, h, number, totalStars < gate ? gate : null);
      return;
    }

    if (done) {
      const badge = this.add.graphics();
      badge.fillStyle(PALETTE.cyan, 1);
      badge.fillRect(x + w - 20, y + 6, 12, 12);
      this.items.push(addCheckGlyph(this.domText, x + w - 14, y + 12, 10, hexToCss(PALETTE.bgVoid)));
      this.items.push(badge);
    }

    // Number, stars and status as one block, centred in the tile. This is
    // the mockup's own three-row tile at last: it always had a middle row
    // (number, chips, time), and ours carried two because there was nothing
    // real to count in the middle — the comment that used to stand here said
    // so, and said the missing row left a 40px hole down every tile. Stars
    // are what goes in it.
    this.pixel(
      x + 7,
      y + h / 2 - 14,
      String(number).padStart(2, '0'),
      done ? PALETTE.textMuted : PALETTE.textDisabled,
      3,
      0,
      0.5,
      undefined,
      { sizePx: this.st(22) },
    );
    this.items.push(drawStarRow(this, x + 7, y + h / 2 + 2, SaveService.getLevelStars(levelId), MAX_STARS));
    this.pixel(
      x + 7,
      y + h / 2 + 20,
      best ?? (done ? t('levelsDone') : t('levelsNew')),
      done ? PALETTE.cyan : PALETTE.labelMuted,
      1,
      0,
      0.5,
      undefined,
      { sizePx: this.st(12) },
    );

    this.hit(x, y, w, h, () => this.startLevel(levelId));
  }

  /**
   * Mockup 4e's locked tile: a padlock over a dimmed number, both centred,
   * and no hit zone at all — the level really is shut until the one before it
   * is cleared (`isLevelUnlocked`), so the tile must not answer a tap.
   */
  private buildLockedTile(x: number, y: number, w: number, h: number, number: number, starGate: number | null): void {
    const cx = x + w / 2;
    const top = y + Math.round((h - 43) / 2);

    const lock = this.add.graphics();
    lock.fillStyle(PALETTE.metalEdge, 1);
    lock.fillRect(cx - 9, top + 8, 18, 14);
    // Shackle: three bars rather than a stroked rect, so it keeps the flat
    // open bottom the mockup draws.
    lock.fillRect(cx - 4, top, 8, 2);
    lock.fillRect(cx - 4, top, 2, 10);
    lock.fillRect(cx + 2, top, 2, 10);
    this.items.push(lock);

    this.pixel(cx, top + 34, String(number).padStart(2, '0'), PALETTE.textDisabled, 2, 0.5, 0.5, undefined, {
      sizePx: this.st(16),
    });

    // A star gate names its price. Without the number the padlock says only
    // "no", and the player has no way to find out what would change that.
    if (starGate === null) return;
    const starX = cx - Math.round((starRowWidth(1) + 4 + 18) / 2);
    this.items.push(drawStarRow(this, starX, y + h - 16, 1, 1, { earnedColor: PALETTE.goldEdge }));
    this.pixel(starX + starRowWidth(1) + 4, y + h - 16 + Math.floor(STAR_PX / 2), String(starGate), PALETTE.goldEdge, 1, 0, 0.5, undefined, {
      sizePx: this.st(11),
    });
  }

  private buildCurrentCard(levelId: string, number: number, sectorDone: boolean): void {
    const y = BIG.y;
    const h = BIG.h;
    const x = this.sx(BIG.x);
    const w = this.sw(BIG.w);

    const g = this.add.graphics();
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(x, y + h, w, 4);
    g.fillGradientStyle(PALETTE.cyanBright, PALETTE.cyanBright, PALETTE.cyan, PALETTE.cyan, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, PALETTE.white, 1);
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    this.items.push(g);

    this.pixel(x + 8, y + 15, sectorDone ? t('levelsAgain') : t('levelsNext'), PALETTE.cyanDim, 1, 0, 0.5, undefined, {
      sizePx: this.st(11),
    });
    this.pixel(x + w - 8, y + 20, String(number).padStart(2, '0'), PALETTE.bgVoid, 3, 1, 0.5, undefined, {
      sizePx: this.st(26),
    });

    this.items.push(addPlayTriangle(this.domText, x + 20, y + 53, 17, 22, hexToCss(PALETTE.bgVoid)));

    const label = this.domText.add(
      x + 36,
      y + 53,
      t('levelsPlay'),
      {
        color: hexToCss(PALETTE.bgVoid),
        // Measured in the same weight it renders in: the probe used to run
        // without `bold`, and Rubik's heavy step is wide enough that the word
        // then overflowed the card it was being fitted to.
        sizePx: this.fit(t('levelsPlay'), w - 44, 22, { bold: true }),
        bold: true,
        uppercase: true,
      },
      0,
      0.5,
    );
    this.items.push(label);

    const best = this.bestTimeText(levelId);
    this.pixel(x + 8, y + h - 14, best ?? t('levelsNew'), PALETTE.cyanDim, 1, 0, 0.5, undefined, {
      sizePx: this.st(10),
    });
    // Right end of the same row as the best time. The empty star is drawn in
    // the card's own dim cyan rather than the gold used on the small tiles:
    // against this lit face, `goldDim` is nearly the same value as `reward`
    // and the row would read as three earned stars.
    this.items.push(
      drawStarRow(
        this,
        x + w - 8 - starRowWidth(MAX_STARS),
        y + h - 14 - Math.floor(STAR_PX / 2),
        SaveService.getLevelStars(levelId),
        MAX_STARS,
        { emptyColor: PALETTE.cyanDim },
      ),
    );

    this.hit(x, y, w, h + 4, () => this.startLevel(levelId));
  }

  private buildShowcase(): void {
    const y = SHOWCASE.y;
    const h = SHOWCASE.h;
    const x = this.sx(SHOWCASE.x);
    const w = this.sw(SHOWCASE.w);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.items.push(g);

    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    if (this.textures.exists(`${prefix}-idle-0`)) {
      const sprite = this.add.sprite(x + w / 2, y + h - 14, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(1.3);
      if (sprite.displayHeight > h - 26) sprite.setScale((h - 26) / sprite.height);
      this.items.push(sprite);
    }
    this.pixel(x + w / 2, y + h - 8, t('levelsUnit'), PALETTE.labelMuted, 1, 0.5, 0.5, undefined, { sizePx: this.st(9) });
  }

  private buildDailyCard(): void {
    const y = DAILY.y;
    const h = DAILY.h;
    const x = this.sx(DAILY.x);
    const w = this.sw(DAILY.w);
    const daily = getDailyChallenge();

    const g = this.add.graphics();
    g.fillStyle(PALETTE.systemDim, 0.45);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, PALETTE.system, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.items.push(g);
    this.items.push(addDiamondGlyph(this.domText, x + 13, y + 14, 10, hexToCss(PALETTE.system)));

    // The title row is measured against a real inner margin on both sides —
    // the diamond's own rotated span on the left, 10px of card on the right.
    // It was previously fitted to within 8px of the border and read as
    // pressed up against it.
    //
    // On a squeezed map the full phrase cannot be shrunk into that box and
    // still be read by a seven-year-old, so it gives way to the written-out
    // short form rather than being squashed below the floor size — the same
    // long/short-by-measurement rule the pause card and the shop rail use.
    const titleX = x + 24;
    const titleAvailable = x + w - 10 - titleX;
    const MIN_TITLE = 9;
    let titleText = t('levelsChallengeShort');
    let titleSize = this.fit(titleText, titleAvailable, 12, { bold: true });
    const full = t('dailyChallenge');
    const fullSize = this.fit(full, titleAvailable, 12, { bold: true });
    if (fullSize >= MIN_TITLE) {
      titleText = full;
      titleSize = fullSize;
    }
    const title = this.domText.add(
      titleX,
      y + 14,
      titleText,
      { color: hexToCss(PALETTE.white), sizePx: titleSize, bold: true, uppercase: true },
      0,
      0.5,
    );
    this.items.push(title);

    this.pixel(
      x + 8,
      y + 34,
      daily.levelId.replace('sector-', '').replace('-level-', ' · '),
      PALETTE.systemLight,
      1,
      0,
      0.5,
      undefined,
      { sizePx: this.st(10) },
    );
    // Fitted rather than just scaled with the map: at the narrowest map the
    // countdown ran past the card's own right border.
    const reset = `${t('levelsChallengeReset')} ${this.timeToReset()}`;
    this.pixel(x + 8, y + 50, reset, PALETTE.systemMuted, 1, 0, 0.5, undefined, {
      sizePx: this.fit(reset, w - 16, this.st(9), { font: 'pixel', letterSpacing: 1 }),
    });

    this.hit(x, y, w, h, () => {
      this.scene.stop('MainMenuScene');
      this.scene.stop();
      // Enters as a DAILY RUN, not as the campaign level it happens to be:
      // a fixed number of lives on one clock, its own result screen, and no
      // campaign progress at either end (see `GameplayScene.DailyRunState`).
      this.scene.start('GameplayScene', {
        levelId: daily.levelId,
        entryTransition: true,
        daily: { date: daily.date, livesLeft: DAILY_LIVES },
      });
    });
  }

  /** Real countdown to the next UTC day — the same clock `getDailyChallenge` keys off. */
  private timeToReset(): string {
    const now = currentChallengeTimeMs();
    const today = new Date(now);
    const next = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1);
    const left = Math.max(0, next - now);
    const hours = Math.floor(left / 3_600_000);
    const minutes = Math.floor((left % 3_600_000) / 60_000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private buildSystemColumn(cleared: number, total: number): void {
    const colW = this.sysW;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.system, 0.12);
    g.fillRect(this.sysX, 38, colW, 110);
    g.fillStyle(PALETTE.system, 1);
    g.fillRect(this.sysX, 38, 2, 110);
    this.items.push(g);

    this.pixel(this.sysX + 8, 48, 'SYSTEM', PALETTE.system, 1, 0, 0.5, undefined, { sizePx: 10 });
    // Prose, not a label — the mockup gives SYSTEM's running lines
    // line-height 1.5 and no tracking (tracking is for labels only). The size
    // is whatever keeps the longest word of the line whole in this column:
    // a word too wide to fit gets split mid-word by the browser's last-resort
    // wrap, which is how "ПОНРАВИТЬСЯ" came out as "ПОНРАВИТЬС / Я".
    const comment = levelSelectComment(cleared, total);
    const commentStyle = { font: 'pixel' as const, uppercase: true, lineHeight: 1.5, letterSpacing: 0 };
    this.pixel(this.sysX + 8, 56, comment, PALETTE.systemLight, 1, 0, 0, colW - 16, {
      ...commentStyle,
      sizePx: this.domText.wordFitSize(comment, { ...commentStyle, color: 'transparent' }, colW - 16, colW >= 110 ? 11 : 10),
      clampLines: 6,
    });

    const box = this.add.graphics();
    box.fillStyle(PALETTE.metalDark, 1);
    box.fillRect(this.sysX, 158, colW, STATS_BOX_H);
    box.lineStyle(1, PALETTE.metalMid, 1);
    box.strokeRect(this.sysX + 0.5, 158.5, colW - 1, STATS_BOX_H - 1);
    this.items.push(box);

    // The sector's star count, pinned to the bottom of the box and drawn
    // BEFORE the best time above it, so the one early return below (a sector
    // with no recorded time yet) cannot skip it. It goes here rather than in
    // the header row: that row was just cleared of an overlap, and a third
    // element in it would spend the room the fix bought.
    const sectorLevels = this.levelsOfSector();
    const sectorStars = SaveService.getSectorStars(sectorLevels);
    const starsY = 158 + STATS_BOX_H - 22;
    this.pixel(this.sysX + 8, starsY, t('levelsSectorStars'), PALETTE.labelMuted, 1, 0, 0.5, undefined, { sizePx: 9 });
    this.items.push(
      drawStarRow(this, this.sysX + 8, starsY + 8, sectorStars === 0 ? 0 : 1, 1, { scale: 1 }),
    );
    this.pixel(
      this.sysX + 8 + starRowWidth(1) + 4,
      starsY + 8 + Math.floor(STAR_PX / 2),
      `${sectorStars} / ${sectorLevels.length * MAX_STARS}`,
      sectorStars === 0 ? PALETTE.textDisabled : PALETTE.reward,
      1,
      0,
      0.5,
      undefined,
      { sizePx: 11 },
    );

    const bestLabel = this.pixel(this.sysX + 8, 166, t('levelsSectorBest'), PALETTE.labelMuted, 1, 0, 0, colW - 16, {
      sizePx: 9,
      clampLines: 2,
    });

    const bestMs = SaveService.getSectorBestMs(sectorIdOf(levelIdFor(this.sector, 1)));
    // Straight under the label, the way the mockup stacks this box (label,
    // then its value 6px below) — but under however many lines the label
    // actually took, measured, not assumed. A fixed offset here worked only
    // while the label fit one line; a wider technical face wraps it to two
    // and the value prints straight through it.
    const valueY = 166 + Math.ceil(bestLabel.height) + 6;
    if (bestMs === null) {
      this.pixel(this.sysX + 8, valueY, t('levelsNoBest'), PALETTE.textDisabled, 1, 0, 0, colW - 16, {
        sizePx: 9,
        clampLines: 3,
      });
      return;
    }
    this.pixel(this.sysX + 8, valueY, this.clock(bestMs), PALETTE.cyan, 3, 0, 0, undefined, { sizePx: 22 });
  }

}
