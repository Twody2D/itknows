import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { formatMmSs } from '@/utils/formatTime';
import { PixelButton } from '@/ui/PixelButton';
import { MenuTile } from '@/ui/MenuTile';
import { DomTextOverlay, type DomTextHandle, type DomTextOptions } from '@/ui/DomTextOverlay';
import { addPlayTriangle } from '@/ui/glyphs';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { personalityTag } from '@/ai/SystemPersonality';
import { sectorIdOf, sectorNumberOf } from '@/gameplay/sectors';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { AdsService } from '@/services/AdsService';
import { CurrencyService } from '@/services/CurrencyService';
import { SaveService } from '@/services/SaveService';
import { LeaderboardService } from '@/services/LeaderboardService';
import { YandexGamesService } from '@/services/YandexGamesService';
import type { YsdkLeaderboardEntry } from '@/services/YandexGamesService';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { rebuildOnResize } from '@/ui/relayout';

export interface SectorCompleteData {
  completedLevelId: string;
  deaths: number;
  timeMs: number;
  nextLevelId: string | undefined;
}

/**
 * Where the right column (SYSTEM line + progress/version) starts, and the
 * narrowest it may be. The column used to be hung off the right edge at
 * `width - 128`, which only clears the screen's own content at 608px or
 * more: at 598 it landed on top of the leaderboard panel and the ДАЛЬШЕ
 * button, and the progress readout printed straight through them. It is
 * pinned past the content instead and takes whatever is left, exactly the
 * way the shop's own SYSTEM column is placed.
 */
const RIGHT_COLUMN_X = 488;
const RIGHT_COLUMN_MIN_W = 86;
const RIGHT_COLUMN_MIN_WIDTH = RIGHT_COLUMN_X + RIGHT_COLUMN_MIN_W + 8;

/**
 * The one natural meta-break in the campaign (master-prompt §14/§27): a
 * sector just ended, so this is where a version bump gets an actual
 * announced moment instead of quietly changing a HUD prefix a player has to
 * notice on their own. Full-screen `start`, not an overlay — the run this
 * sector represents is over, there's nothing paused underneath to return to.
 *
 * Rebuilt to the design-round-2 layout (2026-09-06): a bespoke composed
 * screen (banner/TIME/DEATHS/BEST/leaderboard/credits) in the same visual
 * language the main menu already established, instead of the generic
 * `drawPanel` frame every other overlay uses. Two things the source design
 * asked for were deliberately left out rather than faked (CLAUDE.md #12):
 * a "sector collectible chips" readout (no such mechanic exists anywhere in
 * this game) — replaced with a real campaign-progress count; and per-frame
 * entry-animation timing down to the millisecond — replaced with one
 * coordinated staggered reveal that hits the same beats without an input
 * buffer for the pre-interactive window (the buttons are just interactive
 * from the start).
 *
 * Its type moved to the DOM layer (2026-09-12) along with every other
 * screen's. This was the last one still setting its labels in the canvas
 * bitmap font, and it showed: at the sizes this layout has room for, "МЕНЮ"
 * and the "СЕКТОР 2" line under ДАЛЬШЕ were sub-pixel mush by the time the
 * 270px canvas had been blown up to the viewport.
 */
export class SectorCompleteScene extends Phaser.Scene {
  private sectorData!: SectorCompleteData;
  private sectorId!: string;
  private domText!: DomTextOverlay;
  private leaderboardBody!: Phaser.GameObjects.Container;
  /** DOM labels belonging to the leaderboard rows — cleared whenever the board is re-rendered (signing in re-runs the load). */
  private leaderboardLabels: DomTextHandle[] = [];

  constructor() {
    super('SectorCompleteScene');
  }

  init(data: SectorCompleteData): void {
    this.sectorData = data;
    this.sectorId = sectorIdOf(data.completedLevelId);
  }

  create(): void {
    rebuildOnResize(this, this.sectorData);
    // The one natural ad breakpoint in the campaign (master-prompt "fair ad
    // system" §10) — a no-op today (no live SDK, no purchase to gate on
    // yet), but every future caller of AdsService only ever has to change
    // this file, not hunt for scattered ad calls.
    AdsService.requestInterstitial('SECTOR_COMPLETE');
    CurrencyService.earnCredits(EARN_AMOUNTS.sectorComplete, 'sector_complete');

    const previousBestMs = SaveService.getSectorBestMs(this.sectorId);
    const isNewRecord = previousBestMs === null || this.sectorData.timeMs < previousBestMs;
    SaveService.saveSectorBestIfFaster(this.sectorId, this.sectorData.timeMs);
    void LeaderboardService.submitSectorScore(this.sectorId, this.sectorData.timeMs);

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    fadeIn(this);
    buildRadialGridBackdrop(this, width, height, 'result-backdrop', 0.5, 0.2);

    // The scene instance is reused across restarts (a window resize rebuilds
    // it), so anything held from the previous run points at destroyed objects.
    this.leaderboardLabels = [];
    this.domText = new DomTextOverlay(this, 20);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    const reveal: Phaser.GameObjects.GameObject[] = [];
    reveal.push(this.buildBanner(width));
    reveal.push(this.buildTimeBlock());
    reveal.push(this.buildDeathsBlock());
    reveal.push(this.buildBestBlock(previousBestMs, isNewRecord));
    reveal.push(this.buildLeaderboardPanel());
    reveal.push(this.buildCreditsBlock());
    if (width >= RIGHT_COLUMN_MIN_WIDTH) reveal.push(this.buildRightColumn(width));

    const buttons = this.buildButtons();
    this.playRevealAnimation(reveal, buttons);
    void this.loadLeaderboard();
  }

  /**
   * Fades every block in with a small upward slide, staggered so the eye
   * lands on TIME first — the buttons fade in last but are clickable
   * immediately, no input buffer (see class doc comment). The labels sit
   * outside the display list, so they come up together on their own layer
   * over the same window rather than sliding block by block.
   */
  private playRevealAnimation(blocks: Phaser.GameObjects.GameObject[], buttons: Phaser.GameObjects.GameObject[]): void {
    const withAlpha = blocks as unknown as Array<{ alpha: number; y: number }>;
    for (const block of withAlpha) {
      const originalY = block.y;
      block.alpha = 0;
      block.y = originalY + 6;
    }
    this.tweens.add({
      targets: withAlpha,
      alpha: 1,
      y: '-=6',
      duration: 220,
      ease: 'Sine.easeOut',
      delay: this.tweens.stagger(60, {}),
    });

    for (const btn of buttons) (btn as unknown as { alpha: number }).alpha = 0;
    this.tweens.add({
      targets: buttons,
      alpha: 1,
      duration: 220,
      delay: 420,
      ease: 'Sine.easeOut',
    });

    this.domText.fadeInLayer(520);
  }

  // ---- type ------------------------------------------------------------

  /** The technical face: banner, counters, SYSTEM's own readouts — everything the mockups set in the mono type. */
  private mono(
    x: number,
    y: number,
    text: string,
    color: number,
    sizePx: number,
    origin: [number, number] = [0, 0],
    extra: Partial<DomTextOptions> = {},
  ): DomTextHandle {
    return this.domText.add(
      x,
      y,
      text,
      { color: hexToCss(color), font: 'pixel', sizePx, letterSpacing: 1, uppercase: true, ...extra },
      origin[0],
      origin[1],
    );
  }

  /** The reading face: button labels, and only those — everything else on this screen is a readout. */
  private prose(
    x: number,
    y: number,
    text: string,
    color: number,
    sizePx: number,
    origin: [number, number] = [0, 0],
  ): DomTextHandle {
    return this.domText.add(
      x,
      y,
      text,
      { color: hexToCss(color), sizePx, bold: true, uppercase: true },
      origin[0],
      origin[1],
    );
  }

  /** Largest size up to `max` at which `text` really fits `available` virtual px, measured in the style it will be drawn in. */
  private fit(text: string, available: number, max: number, style: Partial<DomTextOptions>): number {
    const probe = this.domText.add(-1000, -1000, text, { color: 'transparent', sizePx: max, uppercase: true, ...style }, 0, 0);
    const measured = probe.width;
    probe.destroy();
    if (measured <= 0 || measured <= available) return max;
    return Math.max(8, Math.floor((max * available) / measured));
  }

  private panel(x: number, y: number, w: number, h: number, borderColor: number, fillColor: number = PALETTE.metalDark): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, borderColor, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return g;
  }

  // ---- blocks ----------------------------------------------------------

  private buildBanner(width: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(0, 0, width, 32);
    g.lineStyle(1, PALETTE.cyanDim, 1);
    g.lineBetween(0, 32, width, 32);
    container.add(g);

    const sector = sectorNumberOf(this.sectorData.completedLevelId);
    // Built right to left: the status token takes its own measured width and
    // the dot is placed against it, instead of both sitting at offsets that
    // only held for one particular glyph width.
    const status = this.mono(width - 12, 16, 'SYSTEM ONLINE', PALETTE.cyan, 11, [1, 0.5]);
    const dotX = width - 12 - status.width - 10;
    // A square, like the same indicator on the main menu: a 5px circle drawn
    // into the canvas comes out of the nearest-neighbour upscale as a lumpy
    // blob, and at this size the shape carries no meaning a square doesn't.
    const dot = this.add.rectangle(dotX, 16, 5, 5, PALETTE.cyan, 1);
    this.tweens.add({ targets: dot, alpha: { from: 0.5, to: 1 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    container.add(dot);

    const title = `${t('resultTitle').toUpperCase()} ${sector}`;
    this.mono(12, 16, title, PALETTE.white, this.fit(title, dotX - 24, 19, { font: 'pixel', letterSpacing: 2, bold: true }), [0, 0.5], {
      letterSpacing: 2,
      bold: true,
    });

    return container;
  }

  private buildTimeBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 44, 216, 60, PALETTE.cyanDim, PALETTE.bgGraphite));
    this.mono(28, 54, t('resultTime').toUpperCase(), PALETTE.labelMuted, 10, [0, 0.5]);
    this.mono(28, 82, formatMmSs(this.sectorData.timeMs), PALETTE.cyan, 30, [0, 0.5], { bold: true, lineHeight: 1 });
    return container;
  }

  private buildDeathsBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const noDeaths = this.sectorData.deaths === 0;
    const accent = noDeaths ? PALETTE.patrolVisor : PALETTE.dangerAlt;
    const label = noDeaths ? t('resultNoDeaths').toUpperCase() : t('resultDeaths').toUpperCase();

    container.add(this.panel(16, 112, 104, 56, noDeaths ? PALETTE.patrolVisor : PALETTE.metalEdge, PALETTE.bgGraphite));
    this.mono(26, 124, label, PALETTE.labelMuted, this.fit(label, 84, 10, { font: 'pixel', letterSpacing: 1 }), [0, 0.5]);
    this.mono(26, 148, String(this.sectorData.deaths), accent, 20, [0, 0.5], { bold: true, lineHeight: 1 });
    return container;
  }

  private buildBestBlock(previousBestMs: number | null, isNewRecord: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(128, 112, 104, 56, PALETTE.goldDim, PALETTE.bgGraphite));
    this.mono(138, 124, t('resultBest').toUpperCase(), PALETTE.labelMuted, 10, [0, 0.5]);

    const bestToShow = isNewRecord ? this.sectorData.timeMs : (previousBestMs ?? this.sectorData.timeMs);
    this.mono(138, 148, formatMmSs(bestToShow), PALETTE.reward, 20, [0, 0.5], { bold: true, lineHeight: 1 });

    if (isNewRecord && previousBestMs !== null) {
      const badge = this.add.graphics();
      badge.fillStyle(PALETTE.reward, 1);
      badge.fillRect(128, 102, 52, 14);
      container.add(badge);
      this.mono(154, 109, t('resultNewBest').toUpperCase(), PALETTE.bgVoid, 9, [0.5, 0.5], { bold: true });

      this.tweens.add({
        targets: badge,
        alpha: { from: 1, to: 0.4 },
        duration: 250,
        yoyo: true,
        repeat: 2,
      });
    }
    return container;
  }

  private buildCreditsBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 206, 104, 48, PALETTE.goldDim, PALETTE.bgGraphite));
    const label = t('resultCreditsEarned').toUpperCase();
    this.mono(68, 217, label, PALETTE.goldEdge, this.fit(label, 92, 9, { font: 'pixel', letterSpacing: 1 }), [0.5, 0.5]);

    const coin = this.add.circle(38, 234, 6, PALETTE.reward, 1);
    coin.setStrokeStyle(1, PALETTE.goldEdge, 1);
    container.add(coin);
    this.mono(50, 234, `+${EARN_AMOUNTS.sectorComplete}`, PALETTE.reward, 20, [0, 0.5], { bold: true, lineHeight: 1 });
    return container;
  }

  // ---- leaderboard ----------------------------------------------------

  private buildLeaderboardPanel(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(248, 44, 232, 124, PALETTE.metalEdge, PALETTE.bgGraphite));

    const header = this.add.graphics();
    header.fillStyle(PALETTE.bgIndigo, 1);
    header.fillRect(248, 44, 232, 20);
    container.add(header);
    this.mono(
      256,
      54,
      `${t('resultLeaderboardTitle').toUpperCase()} · ${sectorNumberOf(this.sectorData.completedLevelId)}`,
      PALETTE.cyan,
      10,
      [0, 0.5],
    );

    this.leaderboardBody = this.add.container(0, 0);
    container.add(this.leaderboardBody);
    return container;
  }

  /** Both halves of the board — the canvas stripes and the DOM labels — so a second load (after signing in) replaces the first instead of printing over it. */
  private clearLeaderboard(): void {
    this.leaderboardBody.removeAll(true);
    for (const label of this.leaderboardLabels) label.destroy();
    this.leaderboardLabels = [];
  }

  private leaderboardRow(y: number, rank: string, name: string, value: string, colors: { rank: number; name: number; value: number }, bg?: number): void {
    if (bg !== undefined) {
      const stripe = this.add.rectangle(248, y, 232, 22, bg, 1).setOrigin(0, 0);
      this.leaderboardBody.add(stripe);
    }
    this.leaderboardLabels.push(
      this.mono(258, y + 11, rank, colors.rank, 10, [0, 0.5]),
      this.mono(282, y + 11, name.slice(0, 14), colors.name, 10, [0, 0.5], { uppercase: false }),
      this.mono(468, y + 11, value, colors.value, 10, [1, 0.5]),
    );
  }

  private async loadLeaderboard(): Promise<void> {
    this.clearLeaderboard();

    if (!YandexGamesService.isAvailable()) {
      this.leaderboardLabels.push(
        this.mono(364, 110, t('resultLeaderboardOffline').toUpperCase(), PALETTE.labelMuted, 10, [0.5, 0.5]),
      );
      return;
    }

    const [entries, playerEntry] = await Promise.all([
      LeaderboardService.getSectorEntries(this.sectorId, 3),
      LeaderboardService.getPlayerSectorEntry(this.sectorId),
    ]);
    if (!this.scene.isActive()) return; // scene already left before the round-trip resolved

    let y = 64;
    for (const entry of entries) {
      const isPlayerRow = playerEntry !== null && entry.rank === playerEntry.rank;
      this.renderEntryRow(y, entry, isPlayerRow);
      y += 22;
    }

    if (entries.length === 0) {
      this.leaderboardLabels.push(this.mono(364, 110, '—', PALETTE.labelMuted, 10, [0.5, 0.5]));
    }

    const playerShown = playerEntry !== null && entries.some((e) => e.rank === playerEntry.rank);
    if (playerEntry && !playerShown) {
      this.leaderboardRow(
        y + 8,
        `#${playerEntry.rank}`,
        t('resultYou'),
        formatMmSs(playerEntry.score),
        { rank: PALETTE.cyan, name: PALETTE.white, value: PALETTE.cyan },
        PALETTE.systemDim,
      );
    } else if (!playerEntry) {
      this.buildSignInLink(y + 12);
    }
  }

  private renderEntryRow(y: number, entry: YsdkLeaderboardEntry, isPlayerRow: boolean): void {
    const rankColor = entry.rank === 1 ? PALETTE.reward : PALETTE.labelMuted;
    this.leaderboardRow(
      y,
      `#${entry.rank}`,
      isPlayerRow ? t('resultYou') : entry.player.publicName,
      formatMmSs(entry.score),
      { rank: rankColor, name: PALETTE.white, value: PALETTE.labelMuted },
      isPlayerRow ? PALETTE.systemDim : undefined,
    );
  }

  /**
   * A guest sees the board (reading one needs no auth) but not their own row
   * — this is the one door into changing that, same `requestAuthorization()`
   * `SettingsScene` uses. The label is DOM text, which takes no pointer
   * events of its own, so the hit area is a canvas zone sized to it.
   */
  private buildSignInLink(y: number): void {
    const link = this.mono(364, y, t('resultSignIn').toUpperCase(), PALETTE.cyan, 10, [0.5, 0.5]);
    this.leaderboardLabels.push(link);

    const zone = this.add
      .zone(364, y, Math.max(60, link.width + 16), 20)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => link.setColor(hexToCss(PALETTE.white)));
    zone.on('pointerout', () => link.setColor(hexToCss(PALETTE.cyan)));
    zone.on('pointerup', () => {
      void YandexGamesService.requestAuthorization().then((ok) => {
        if (ok) void this.loadLeaderboard();
      });
    });
    this.leaderboardBody.add(zone);
  }

  // ---- right column (wide screens only) --------------------------------

  private buildRightColumn(width: number): Phaser.GameObjects.Container {
    const x = RIGHT_COLUMN_X;
    const colW = width - 8 - x;
    const container = this.add.container(0, 0);

    container.add(this.panel(x, 44, colW, 124, PALETTE.system, PALETTE.systemDim));
    this.mono(x + 8, 54, 'SYSTEM', PALETTE.system, 10, [0, 0.5]);

    const oldTag = personalityTag(this.sectorData.completedLevelId);
    const newTag = this.sectorData.nextLevelId ? personalityTag(this.sectorData.nextLevelId) : oldTag;
    const systemLine = (newTag !== oldTag ? `${t('resultSystemUpdate')} SYSTEM ${newTag}` : `SYSTEM ${oldTag}`).toUpperCase();
    // Sized so the longest word still fits the column whole — a word wider
    // than the column would otherwise be split mid-word by the browser's
    // last-resort wrap.
    const lineStyle: Partial<DomTextOptions> = { font: 'pixel', uppercase: true, lineHeight: 1.5, letterSpacing: 0 };
    const lineW = colW - 16;
    this.mono(
      x + 8,
      66,
      systemLine,
      PALETTE.systemLight,
      this.domText.wordFitSize(systemLine, { color: 'transparent', ...lineStyle }, lineW, 11),
      [0, 0],
      { ...lineStyle, wordWrapWidth: lineW, clampLines: 4 },
    );

    const completed = SaveService.getCompletedLevels().length;
    const total = getAllLevels().length;
    container.add(this.panel(x, 180, colW, 74, PALETTE.metalEdge, PALETTE.bgGraphite));
    this.mono(x + 8, 192, t('resultProgress').toUpperCase(), PALETTE.labelMuted, 9, [0, 0.5]);
    this.mono(x + 8, 210, `${completed} / ${total}`, PALETTE.white, 16, [0, 0.5], { bold: true, lineHeight: 1 });
    this.mono(x + 8, 242, `v${__APP_VERSION__}`, PALETTE.systemMuted, 9, [0, 0.5]);

    return container;
  }

  // ---- buttons ----------------------------------------------------------

  private buildButtons(): Phaser.GameObjects.GameObject[] {
    // The label is drawn on the DOM layer, not in the button's own bitmap
    // font: at the size this 104px button has room for, the canvas glyphs are
    // 5px tall before the upscale and unreadable after it.
    const menuLabel = this.prose(180, 230, t('resultMenu'), PALETTE.cyan, 14, [0.5, 0.5]);
    const menuBtn = new PixelButton(this, 180, 230, t('resultMenu'), {
      width: 104,
      height: 48,
      variant: 'secondary',
      hideLabel: true,
      onLabelState: ({ color, offsetY }) => {
        menuLabel.setColor(hexToCss(color));
        menuLabel.setPosition(180, 230 + offsetY);
      },
      onClick: () => this.scene.start('MainMenuScene'),
    });

    const nextLevelId = this.sectorData.nextLevelId;
    const hasNext = nextLevelId !== undefined;
    const primaryLabel = (hasNext ? t('next') : t('resultToMenu')).toUpperCase();
    const subtitle = nextLevelId
      ? `${t('resultSectorLabel').toUpperCase()} ${sectorNumberOf(nextLevelId)}`
      : t('resultAllDoneShort').toUpperCase();

    const BTN = { x: 248, y: 196, w: 232, h: 58 };
    // Icon box + gap + the wider of the two stacked lines, centred in the
    // face the way the menu's own PLAY tile centres its content.
    const textAvailable = BTN.w - 22 - 16 - 16;
    const labelSize = this.fit(primaryLabel, textAvailable, 22, { bold: true });
    const subtitleSize = this.fit(subtitle, textAvailable, 11, { font: 'pixel', letterSpacing: 1 });
    const label = this.prose(0, 0, primaryLabel, PALETTE.bgVoid, labelSize, [0, 0.5]);
    const sub = this.mono(0, 0, subtitle, PALETTE.bgVoid, subtitleSize, [0, 0.5]);
    const contentWidth = 22 + 16 + Math.max(label.width, sub.width);

    // `onLabelState` below closes over `dalshe` ahead of its own declaration
    // — safe because it only runs on a later pointer event, well after the
    // tile is initialized (the same pattern `MainMenuScene`'s tiles use).
    const arrow = addPlayTriangle(this.domText, 0, 0, 18, 24, hexToCss(PALETTE.bgVoid));
    const dalshe: MenuTile = new MenuTile(this, {
      x: BTN.x,
      y: BTN.y,
      width: BTN.w,
      height: BTN.h,
      variant: 'primary',
      icon: hasNext ? 'play' : 'levels',
      accent: PALETTE.cyanDim,
      hoverAccent: PALETTE.cyan,
      iconAccent: PALETTE.bgVoid,
      contentWidth,
      onClick: () => {
        if (this.sectorData.nextLevelId) {
          this.scene.start('GameplayScene', { levelId: this.sectorData.nextLevelId, entryTransition: true });
        } else {
          this.scene.start('MainMenuScene');
        }
      },
      onLabelState: ({ color, offsetY, iconColor }) => {
        label.setColor(hexToCss(color));
        sub.setColor(hexToCss(color));
        label.setPosition(dalshe.labelX, dalshe.labelY - 10 + offsetY);
        sub.setPosition(dalshe.labelX, dalshe.labelY + 12 + offsetY);
        arrow.setColor(hexToCss(iconColor));
        arrow.setPosition(dalshe.iconX, dalshe.iconY + offsetY);
      },
    });
    label.setPosition(dalshe.labelX, dalshe.labelY - 10);
    sub.setPosition(dalshe.labelX, dalshe.labelY + 12);
    // The play arrow is a DOM glyph like every other diagonal in the UI
    // (`DIAGONAL_ICONS`), so the tile draws no pictogram of its own — without
    // this the primary button on this screen came up with an empty icon box.
    arrow.setVisible(hasNext);
    arrow.setPosition(dalshe.iconX, dalshe.iconY);

    return [menuBtn, dalshe];
  }
}
