import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import { buildScreenTopbar, attachEscape } from '@/ui/ScreenChrome';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { playSfx } from '@/audio/SfxManager';
import { LEVELS_PER_SECTOR, SECTOR_COUNT, levelIdFor, sectorIdOf, sectorName } from '@/gameplay/sectors';
import { SaveService } from '@/services/SaveService';
import { GhostService } from '@/services/GhostService';
import { InventoryService } from '@/services/InventoryService';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';
import { levelSelectComment } from '@/data/dialogues/levelSelect';
import { DAILY_CHALLENGE_VARIANT_ID, currentChallengeTimeMs, getDailyChallenge } from '@/gameplay/DailyChallenge';

/**
 * The level map, rebuilt against Claude Design mockup 4e: one sector at a
 * time as a route of small cards, with the level the player is actually on
 * blown up into a single lit PLAY card, instead of six identical numbered
 * buttons.
 *
 * Two deliberate departures from the mockup, both because the drawing would
 * otherwise state something the game does not do:
 * - **No chips.** The mockup's three-chip row counts collectibles that do
 *   not exist in this game. The card shows what the save really holds
 *   instead: cleared or not, and the personal best time from the player's
 *   own ghost record.
 * - **No padlocks.** Levels are not gated behind completion here (existing
 *   design, not an oversight), so an untouched level keeps the mockup's dim
 *   treatment but never draws a lock it could not enforce.
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
const DAILY = { x: 298, y: 158, w: 118, h: 62 };
const SYS_X = 492;

export class LevelSelectScene extends Phaser.Scene {
  private domText!: DomTextOverlay;
  private sector = 1;
  private items: Array<{ destroy(): void }> = [];

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
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

    buildScreenTopbar(this, this.domText, {
      title: t('levels'),
      accent: PALETTE.cyan,
      onBack: () => this.scene.stop(),
    });
    attachEscape(this, () => this.scene.stop());

    this.renderSector();
  }

  // ---- helpers -----------------------------------------------------------

  private pixel(
    x: number,
    y: number,
    text: string,
    color: number,
    scale: number,
    originX = 0,
    originY = 0.5,
    wrapWidth?: number,
  ): PixelLabel {
    const label = new PixelLabel(this, Math.round(x), Math.round(y), text, {
      color: hexToCss(color),
      scale,
      ...(wrapWidth === undefined ? {} : { wordWrapWidth: wrapWidth }),
    });
    label.setOrigin(originX, originY);
    this.items.push(label);
    return label;
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
    const ghost = GhostService.getGhost(levelId, 'standard');
    return ghost ? this.clock(ghost.timeMs) : null;
  }

  private startLevel(levelId: string): void {
    this.scene.stop('MainMenuScene');
    this.scene.stop();
    this.scene.start('GameplayScene', { levelId, entryTransition: true });
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      playSfx('uiClick');
      onClick();
    });
    this.items.push(zone);
  }

  /** Same pixel-art tick the shop draws — a rotated rect turns to mush under the canvas upscale. */
  private drawCheck(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number): void {
    const left = Math.round(cx - 3.5);
    const top = Math.round(cy - 3);
    g.fillStyle(color, 1);
    const steps: [number, number, number][] = [
      [0, 3, 2],
      [1, 4, 2],
      [2, 5, 1],
      [3, 4, 1],
      [4, 2, 2],
      [5, 1, 2],
      [6, 0, 2],
    ];
    for (const [dx, dy, h] of steps) g.fillRect(left + dx, top + dy, 1, h);
  }

  // ---- screen ------------------------------------------------------------

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
    this.pixel(
      150,
      15,
      `${t('levelSelectSector')} ${String(this.sector).padStart(2, '0')} · ${sectorName(this.sector)}`,
      PALETTE.system,
      1,
    );

    const barX = Math.min(this.scale.width - 108, 352);
    const bar = this.add.graphics();
    bar.fillStyle(PALETTE.metalMid, 1);
    bar.fillRect(barX, 11, 60, 8);
    bar.fillStyle(PALETTE.cyan, 1);
    bar.fillRect(barX, 11, Math.round((60 * cleared) / total), 8);
    this.items.push(bar);
    this.pixel(barX + 66, 15, `${cleared} / ${total}`, PALETTE.cyan, 1);
  }

  private buildArrows(): void {
    const draw = (x: number, forward: boolean): void => {
      const g = this.add.graphics();
      g.fillStyle(PALETTE.metalDark, 1);
      g.fillRect(x, 38, 22, 200);
      g.lineStyle(1, PALETTE.metalEdge, 1);
      g.strokeRect(x + 0.5, 38.5, 21, 199);
      g.lineStyle(2, PALETTE.cyan, 1);
      g.beginPath();
      if (forward) {
        g.moveTo(x + 8, 132);
        g.lineTo(x + 14, 138);
        g.lineTo(x + 8, 144);
      } else {
        g.moveTo(x + 14, 132);
        g.lineTo(x + 8, 138);
        g.lineTo(x + 14, 144);
      }
      g.strokePath();
      this.items.push(g);
      this.hit(x, 38, 22, 200, () => {
        this.sector = Phaser.Math.Wrap(this.sector - 1 + (forward ? 1 : -1), 0, SECTOR_COUNT) + 1;
        this.renderSector();
      });
    };

    draw(12, false);
    draw(446, true);
  }

  private buildRoute(cleared: number, total: number): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(64, 96, 352, 3);
    g.fillRect(64, 184, 352, 3);
    g.fillStyle(PALETTE.cyan, 1);
    g.fillRect(64, 96, Math.round((352 * cleared) / total), 3);
    this.items.push(g);
  }

  private buildSmallCard(levelId: string, number: number, x: number, y: number, h: number): void {
    const done = SaveService.isCompleted(levelId);
    const best = done ? this.bestTimeText(levelId) : null;

    const g = this.add.graphics();
    g.fillStyle(done ? PALETTE.metalDark : PALETTE.bgGraphite, 1);
    g.fillRect(x, y, SMALL_W, h);
    g.lineStyle(1, done ? PALETTE.cyanDim : PALETTE.metalMid, 1);
    g.strokeRect(x + 0.5, y + 0.5, SMALL_W - 1, h - 1);
    this.items.push(g);

    if (done) {
      const badge = this.add.graphics();
      badge.fillStyle(PALETTE.cyan, 1);
      badge.fillRect(x + SMALL_W - 20, y + 6, 12, 12);
      this.drawCheck(badge, x + SMALL_W - 14, y + 12, PALETTE.bgVoid);
      this.items.push(badge);
    }

    this.pixel(x + 7, y + 20, String(number).padStart(2, '0'), done ? PALETTE.textMuted : PALETTE.textDisabled, 3);
    this.pixel(
      x + 7,
      y + h - 12,
      best ?? (done ? t('levelsDone') : t('levelsNew')),
      done ? PALETTE.cyan : PALETTE.labelMuted,
      1,
    );

    this.hit(x, y, SMALL_W, h, () => this.startLevel(levelId));
  }

  private buildCurrentCard(levelId: string, number: number, sectorDone: boolean): void {
    const { x, y, w, h } = BIG;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(x, y + h, w, 4);
    g.fillGradientStyle(PALETTE.cyanBright, PALETTE.cyanBright, PALETTE.cyan, PALETTE.cyan, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, PALETTE.white, 1);
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    this.items.push(g);

    this.pixel(x + 8, y + 15, sectorDone ? t('levelsAgain') : t('levelsNext'), PALETTE.cyanDim, 1);
    this.pixel(x + w - 8, y + 18, String(number).padStart(2, '0'), PALETTE.bgVoid, 3, 1);

    const play = this.add.graphics();
    play.fillStyle(PALETTE.bgVoid, 1);
    play.fillTriangle(x + 12, y + 42, x + 12, y + 64, x + 29, y + 53);
    this.items.push(play);

    const label = this.domText.add(
      x + 36,
      y + 53,
      t('levelsPlay'),
      { color: hexToCss(PALETTE.bgVoid), sizePx: 22, bold: true, uppercase: true },
      0,
      0.5,
    );
    this.items.push(label);

    const best = this.bestTimeText(levelId);
    this.pixel(x + 8, y + h - 14, best ?? t('levelsNew'), PALETTE.cyanDim, 1);

    this.hit(x, y, w, h + 4, () => this.startLevel(levelId));
  }

  private buildShowcase(): void {
    const { x, y, w, h } = SHOWCASE;
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
    this.pixel(x + w / 2, y + h - 8, t('levelsUnit'), PALETTE.labelMuted, 1, 0.5);
  }

  private buildDailyCard(): void {
    const { x, y, w, h } = DAILY;
    const daily = getDailyChallenge();

    const g = this.add.graphics();
    g.fillStyle(PALETTE.systemDim, 0.45);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, PALETTE.system, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle(PALETTE.system, 1);
    g.save();
    g.translateCanvas(x + 14, y + 14);
    g.rotateCanvas(Math.PI / 4);
    g.fillRect(-6, -6, 12, 12);
    g.restore();
    this.items.push(g);

    const title = this.domText.add(
      x + 26,
      y + 14,
      t('dailyChallenge'),
      { color: hexToCss(PALETTE.white), sizePx: 11, bold: true, uppercase: true },
      0,
      0.5,
    );
    this.items.push(title);

    this.pixel(x + 8, y + 34, daily.levelId.replace('sector-', '').replace('-level-', ' · '), PALETTE.systemLight, 1);
    this.pixel(x + 8, y + 50, `${t('levelsChallengeReset')} ${this.timeToReset()}`, PALETTE.systemMuted, 1);

    this.hit(x, y, w, h, () => {
      this.scene.stop('MainMenuScene');
      this.scene.stop();
      this.scene.start('GameplayScene', {
        levelId: daily.levelId,
        forceVariantId: DAILY_CHALLENGE_VARIANT_ID,
        entryTransition: true,
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
    const colW = this.scale.width - 8 - SYS_X;
    if (colW < 80) {
      this.buildSystemStrip(cleared, total);
      return;
    }

    const g = this.add.graphics();
    g.fillStyle(PALETTE.system, 0.12);
    g.fillRect(SYS_X, 38, colW, 110);
    g.fillStyle(PALETTE.system, 1);
    g.fillRect(SYS_X, 38, 2, 110);
    this.items.push(g);

    this.pixel(SYS_X + 8, 48, 'SYSTEM', PALETTE.system, 1);
    this.pixel(SYS_X + 8, 58, levelSelectComment(cleared, total), PALETTE.systemLight, 1, 0, 0, colW - 14);

    const box = this.add.graphics();
    box.fillStyle(PALETTE.metalDark, 1);
    box.fillRect(SYS_X, 158, colW, 80);
    box.lineStyle(1, PALETTE.metalMid, 1);
    box.strokeRect(SYS_X + 0.5, 158.5, colW - 1, 79);
    this.items.push(box);

    this.pixel(SYS_X + 8, 168, t('levelsSectorBest'), PALETTE.labelMuted, 1, 0, 0, colW - 14);

    const bestMs = SaveService.getSectorBestMs(sectorIdOf(levelIdFor(this.sector, 1)));
    if (bestMs === null) {
      this.pixel(SYS_X + 8, 196, t('levelsNoBest'), PALETTE.textDisabled, 1, 0, 0, colW - 14);
      return;
    }
    this.pixel(SYS_X + 8, 206, this.clock(bestMs), PALETTE.cyan, 3, 0, 0.5);
  }

  /**
   * The mockup's own content zone ends at 468, so on a 480px canvas there is
   * no room beside it for SYSTEM's column. The line moves under the route
   * instead of being dropped — the same rule the shop follows.
   */
  private buildSystemStrip(cleared: number, total: number): void {
    // Starts past the unit showcase (which runs to 238) rather than over it.
    const x = SMALL_SLOTS[1]![0];
    const w = DAILY.x + DAILY.w - x;
    const y = 226;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.system, 0.12);
    g.fillRect(x, y, w, 34);
    g.fillStyle(PALETTE.system, 1);
    g.fillRect(x, y, 2, 34);
    this.items.push(g);

    this.pixel(x + 8, y + 10, 'SYSTEM', PALETTE.system, 1);
    this.pixel(x + 8, y + 20, levelSelectComment(cleared, total), PALETTE.systemLight, 1, 0, 0, w - 16);
  }
}
