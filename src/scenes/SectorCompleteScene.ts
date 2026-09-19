import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { formatMmSs } from '@/utils/formatTime';
import { PixelButton } from '@/ui/PixelButton';
import { MenuTile } from '@/ui/MenuTile';
import { DomTextOverlay, type DomTextHandle, type DomTextOptions } from '@/ui/DomTextOverlay';
import { addPlayTriangle } from '@/ui/glyphs';
import { STAR_PX, drawStarRow, starRowWidth } from '@/ui/StarRow';
import { MAX_STARS } from '@/gameplay/stars';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { personalityTag } from '@/ai/SystemPersonality';
import { LEVELS_PER_SECTOR, levelIdFor, sectorIdOf, sectorNumberOf } from '@/gameplay/sectors';
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

/** How long the result screen takes to arrive — one duration for the panels, the buttons and the text layer alike. */
const REVEAL_MS = 260;

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
 * a "sector collectible chips" readout (no such mechanic existed anywhere in
 * this game) — replaced with a real campaign-progress count, and since
 * joined by the sector's star tally, which is the thing per-sector worth
 * collecting that the design was reaching for; and per-frame
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
    reveal.push(this.buildStarsBlock());
    reveal.push(this.buildLeaderboardPanel());
    reveal.push(this.buildCreditsBlock());
    if (width >= RIGHT_COLUMN_MIN_WIDTH) reveal.push(this.buildRightColumn(width));

    const buttons = this.buildButtons();
    this.playRevealAnimation(reveal, buttons);
    void this.loadLeaderboard();
  }

  /**
   * ONE MOTION FOR THE WHOLE SCREEN: every block, every button and the text
   * layer fade up together over `REVEAL_MS`, and nothing slides.
   *
   * It used to stagger the blocks 60ms apart with a 6px rise and hold the
   * buttons back to 420ms — a nice idea that the screen could not actually
   * perform, because every word on it is DOM text on a layer of its own
   * (`DomTextOverlay`) and that layer can only fade as one piece. So the
   * readouts were legible from the first frame while their panels were
   * still arriving underneath them, and then the buttons slid in on their
   * own beat after everything else had settled. The owner read exactly
   * that off the screen: "текст появляется сразу, а кнопки выезжают".
   *
   * A staggered reveal is only worth having if the text can be part of it.
   * It cannot, so the screen arrives as one thing instead — which is also
   * the honest description of what it is. The buttons are clickable from
   * the first frame regardless, fade or no fade (see class doc comment).
   */
  private playRevealAnimation(blocks: Phaser.GameObjects.GameObject[], buttons: Phaser.GameObjects.GameObject[]): void {
    const targets = [...blocks, ...buttons] as unknown as Array<{ alpha: number }>;
    for (const target of targets) target.alpha = 0;
    this.tweens.add({
      targets,
      alpha: 1,
      duration: REVEAL_MS,
      ease: 'Sine.easeOut',
    });
    this.domText.fadeInLayer(REVEAL_MS);
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
      // The badge is sized from the label, not the other way round. It was
      // a hard-coded 52px box, which the Russian string ("НОВЫЙ РЕКОРД")
      // overflowed on both sides — the fill has to follow whatever the
      // measured text actually is, and the text has to shrink if even the
      // panel's own width cannot hold it.
      const label = t('resultNewBest').toUpperCase();
      const padX = 5;
      const size = this.fit(label, 104 - padX * 2, 9, { font: 'pixel', letterSpacing: 1, bold: true });
      const text = this.mono(128 + padX, 109, label, PALETTE.bgVoid, size, [0, 0.5], { bold: true });
      const badge = this.add.graphics();
      badge.fillStyle(PALETTE.reward, 1);
      badge.fillRect(128, 102, Math.min(Math.ceil(text.width) + padX * 2, 104), 14);
      container.add(badge);

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

  /**
   * The sector's star tally, in the 30px band between the deaths/best row and
   * the credits row — the only space on this column the layout left free, and
   * the right one: it reads straight after the two numbers that decide two of
   * the three stars.
   *
   * It counts the WHOLE sector, not this run: the player has just finished
   * the last level of six, and what they need to know is how much of the
   * sector is still worth returning to.
   */
  private buildStarsBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 172, 216, 28, PALETTE.goldDim, PALETTE.bgGraphite));

    const sector = sectorNumberOf(this.sectorData.completedLevelId);
    const levelIds = Array.from({ length: LEVELS_PER_SECTOR }, (_, i) => levelIdFor(sector, i + 1));
    const earned = SaveService.getSectorStars(levelIds);
    const total = levelIds.length * MAX_STARS;

    const label = t('levelsSectorStars').toUpperCase();
    this.mono(26, 186, label, PALETTE.labelMuted, this.fit(label, 110, 10, { font: 'pixel', letterSpacing: 1 }), [0, 0.5]);

    const count = `${earned} / ${total}`;
    const countHandle = this.mono(222, 186, count, earned === 0 ? PALETTE.textDisabled : PALETTE.reward, 14, [1, 0.5], {
      bold: true,
      lineHeight: 1,
    });
    container.add(
      drawStarRow(this, 222 - Math.ceil(countHandle.width) - 6 - starRowWidth(1), 186 - Math.floor(STAR_PX / 2), earned === 0 ? 0 : 1, 1),
    );
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

    // A board that could not be read at all says so, instead of looking
    // like a board nobody has posted to yet (`null` vs `[]`).
    if (entries === null) {
      this.leaderboardLabels.push(
        this.mono(364, 110, t('resultLeaderboardOffline').toUpperCase(), PALETTE.labelMuted, 10, [0.5, 0.5]),
      );
      return;
    }

    let y = 64;
    for (const entry of entries) {
      const isPlayerRow = playerEntry !== null && entry.rank === playerEntry.rank;
      this.renderEntryRow(y, entry, isPlayerRow);
      y += 22;
    }

    if (entries.length === 0) {
      this.leaderboardLabels.push(
        this.mono(364, 96, t('resultLeaderboardEmpty').toUpperCase(), PALETTE.labelMuted, 10, [0.5, 0.5]),
      );
      // `y` still points at the first (never drawn) row, which would put the
      // sign-in link ABOVE the message explaining why there are no rows.
      y = 104;
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
