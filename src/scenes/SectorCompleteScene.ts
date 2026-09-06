import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { formatMmSs } from '@/utils/formatTime';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { MenuTile } from '@/ui/MenuTile';
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

export interface SectorCompleteData {
  completedLevelId: string;
  deaths: number;
  timeMs: number;
  nextLevelId: string | undefined;
}

/** Right column (SYSTEM line + progress/version) only earns its keep once there's room for it — same 560px threshold `MENU_LAYOUT.systemLine` uses on the main menu. */
const RIGHT_COLUMN_MIN_WIDTH = 560;

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
 */
export class SectorCompleteScene extends Phaser.Scene {
  private sectorData!: SectorCompleteData;
  private sectorId!: string;
  private leaderboardBody!: Phaser.GameObjects.Container;

  constructor() {
    super('SectorCompleteScene');
  }

  init(data: SectorCompleteData): void {
    this.sectorData = data;
    this.sectorId = sectorIdOf(data.completedLevelId);
  }

  create(): void {
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

  /** Fades every block in with a small upward slide, staggered so the eye lands on TIME first — the buttons fade in last but are clickable immediately, no input buffer (see class doc comment). */
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
  }

  private label(
    x: number,
    y: number,
    text: string,
    color: number,
    scale: number,
    origin: [number, number] = [0, 0],
    wordWrapWidth?: number,
  ): PixelLabel {
    return new PixelLabel(this, x, y, text, {
      color: hexToCss(color),
      strokeColor: hexToCss(PALETTE.outline),
      scale,
      ...(wordWrapWidth !== undefined ? { wordWrapWidth } : {}),
    }).setOrigin(origin[0], origin[1]);
  }

  private panel(x: number, y: number, w: number, h: number, borderColor: number, fillColor: number = PALETTE.metalDark): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, borderColor, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return g;
  }

  private buildBanner(width: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(0, 0, width, 32);
    g.lineStyle(1, PALETTE.cyanDim, 1);
    g.lineBetween(0, 32, width, 32);
    container.add(g);

    const sector = sectorNumberOf(this.sectorData.completedLevelId);
    container.add(
      this.label(12, 16, `${t('resultTitle').toUpperCase()} ${sector}`, PALETTE.white, 2, [0, 0.5]),
    );

    const dot = this.add.circle(width - 100, 16, 2.5, PALETTE.cyan, 1);
    this.tweens.add({ targets: dot, alpha: { from: 0.5, to: 1 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    container.add(dot);
    container.add(this.label(width - 92, 16, 'SYSTEM ONLINE', PALETTE.cyan, 1, [0, 0.5]));

    return container;
  }

  private buildTimeBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 44, 216, 60, PALETTE.cyanDim, PALETTE.bgGraphite));
    container.add(this.label(28, 52, t('resultTime').toUpperCase(), PALETTE.labelMuted, 1));
    container.add(this.label(28, 68, formatMmSs(this.sectorData.timeMs), PALETTE.cyan, 3));
    return container;
  }

  private buildDeathsBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const noDeaths = this.sectorData.deaths === 0;
    const accent = noDeaths ? PALETTE.patrolVisor : PALETTE.dangerAlt;

    container.add(this.panel(16, 112, 104, 56, noDeaths ? PALETTE.patrolVisor : PALETTE.metalEdge, PALETTE.bgGraphite));
    container.add(this.label(26, 120, noDeaths ? t('resultNoDeaths').toUpperCase() : t('resultDeaths').toUpperCase(), PALETTE.labelMuted, 1));
    container.add(this.label(26, 136, String(this.sectorData.deaths), accent, 2));
    return container;
  }

  private buildBestBlock(previousBestMs: number | null, isNewRecord: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(128, 112, 104, 56, PALETTE.goldDim, PALETTE.bgGraphite));
    container.add(this.label(138, 120, t('resultBest').toUpperCase(), PALETTE.labelMuted, 1));

    const bestToShow = isNewRecord ? this.sectorData.timeMs : (previousBestMs ?? this.sectorData.timeMs);
    container.add(this.label(138, 136, formatMmSs(bestToShow), PALETTE.reward, 2));

    if (isNewRecord && previousBestMs !== null) {
      const badge = this.add.graphics();
      badge.fillStyle(PALETTE.reward, 1);
      badge.fillRect(128, 104, 44, 12);
      container.add(badge);
      container.add(this.label(150, 110, t('resultNewBest').toUpperCase(), PALETTE.bgVoid, 1, [0.5, 0.5]));

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
    container.add(this.label(60, 214, t('resultCreditsEarned').toUpperCase(), PALETTE.goldEdge, 1, [0.5, 0]));

    const coin = this.add.circle(38, 232, 6, PALETTE.reward, 1);
    coin.setStrokeStyle(1, PALETTE.goldEdge, 1);
    container.add(coin);
    container.add(this.label(50, 232, `+${EARN_AMOUNTS.sectorComplete}`, PALETTE.reward, 2, [0, 0.5]));
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
    container.add(this.label(256, 54, `${t('resultLeaderboardTitle').toUpperCase()} · ${sectorNumberOf(this.sectorData.completedLevelId)}`, PALETTE.cyan, 1, [0, 0.5]));

    this.leaderboardBody = this.add.container(0, 0);
    container.add(this.leaderboardBody);
    return container;
  }

  private leaderboardRow(y: number, rank: string, name: string, value: string, colors: { rank: number; name: number; value: number }, bg?: number): void {
    if (bg !== undefined) {
      const stripe = this.add.rectangle(248, y, 232, 22, bg, 1).setOrigin(0, 0);
      this.leaderboardBody.add(stripe);
    }
    this.leaderboardBody.add(this.label(258, y + 11, rank, colors.rank, 1, [0, 0.5]));
    this.leaderboardBody.add(this.label(282, y + 11, name.slice(0, 14), colors.name, 1, [0, 0.5]));
    this.leaderboardBody.add(this.label(468, y + 11, value, colors.value, 1, [1, 0.5]));
  }

  private async loadLeaderboard(): Promise<void> {
    if (!YandexGamesService.isAvailable()) {
      this.leaderboardBody.add(
        this.label(364, 90, t('resultLeaderboardOffline').toUpperCase(), PALETTE.labelMuted, 1, [0.5, 0.5]),
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
      this.leaderboardBody.add(this.label(364, 90, '—', PALETTE.labelMuted, 1, [0.5, 0.5]));
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
      this.leaderboardBody.add(
        this.buildSignInLink(y + 10),
      );
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

  /** A guest sees the board (reading one needs no auth) but not their own row — this is the one door into changing that, same `requestAuthorization()` `SettingsScene` uses. */
  private buildSignInLink(y: number): Phaser.GameObjects.GameObject {
    const link = this.label(364, y, t('resultSignIn').toUpperCase(), PALETTE.cyan, 1, [0.5, 0.5]);
    link.setInteractive({ useHandCursor: true });
    link.on('pointerup', () => {
      void YandexGamesService.requestAuthorization().then((ok) => {
        if (ok) void this.loadLeaderboard();
      });
    });
    return link;
  }

  // ---- right column (wide screens only) --------------------------------

  private buildRightColumn(width: number): Phaser.GameObjects.Container {
    const x = width - 128;
    const container = this.add.container(0, 0);

    container.add(this.panel(x, 44, 116, 124, PALETTE.system, PALETTE.systemDim));
    container.add(this.label(x + 8, 52, 'SYSTEM', PALETTE.system, 1));

    const oldTag = personalityTag(this.sectorData.completedLevelId);
    const newTag = this.sectorData.nextLevelId ? personalityTag(this.sectorData.nextLevelId) : oldTag;
    const systemLine =
      newTag !== oldTag ? `${t('resultSystemUpdate')} SYSTEM ${newTag}` : `SYSTEM ${oldTag}`;
    container.add(this.label(x + 8, 68, systemLine.toUpperCase(), PALETTE.systemLight, 1, [0, 0], 100));

    const completed = SaveService.getCompletedLevels().length;
    const total = getAllLevels().length;
    container.add(this.panel(x, 180, 116, 74, PALETTE.metalEdge, PALETTE.bgGraphite));
    container.add(this.label(x + 8, 188, t('resultProgress').toUpperCase(), PALETTE.labelMuted, 1));
    container.add(this.label(x + 8, 202, `${completed} / ${total}`, PALETTE.white, 1));
    container.add(this.label(x + 8, 240, `v${__APP_VERSION__}`, PALETTE.systemMuted, 1));

    return container;
  }

  // ---- buttons ----------------------------------------------------------

  private buildButtons(): Phaser.GameObjects.GameObject[] {
    const menuBtn = new PixelButton(this, 180, 230, t('resultMenu'), {
      width: 104,
      height: 48,
      textScale: 1,
      variant: 'secondary',
      onClick: () => this.scene.start('MainMenuScene'),
    });

    const nextLevelId = this.sectorData.nextLevelId;
    const hasNext = nextLevelId !== undefined;
    const primaryLabel = hasNext ? t('next') : t('resultToMenu');
    const subtitle = nextLevelId
      ? `${t('resultSectorLabel').toUpperCase()} ${sectorNumberOf(nextLevelId)}`
      : t('resultAllDoneShort').toUpperCase();

    // `onLabelState` below closes over `dalshe`/`dalsheLabel`/`dalsheSubtitle`
    // ahead of their own declarations — safe because it only runs on a later
    // pointer event, well after all three are initialized (same pattern
    // `MainMenuScene`'s tiles use for their own label callbacks). The labels
    // themselves are still built *after* `dalshe` on purpose: a PixelLabel is
    // a plain canvas object (unlike the menu's DOM-text labels), so it has to
    // be added to the display list after the tile's own opaque fill or the
    // fill paints over it and the button reads as blank.
    const dalshe = new MenuTile(this, {
      x: 248,
      y: 196,
      width: 232,
      height: 58,
      variant: 'primary',
      icon: hasNext ? 'play' : 'levels',
      accent: PALETTE.cyanDim,
      hoverAccent: PALETTE.cyan,
      iconAccent: PALETTE.bgVoid,
      onClick: () => {
        if (this.sectorData.nextLevelId) {
          this.scene.start('GameplayScene', { levelId: this.sectorData.nextLevelId, entryTransition: true });
        } else {
          this.scene.start('MainMenuScene');
        }
      },
      onLabelState: ({ color, offsetY }) => {
        dalsheLabel.setPixelColor(hexToCss(color));
        dalsheSubtitle.setPixelColor(hexToCss(color));
        dalsheLabel.setPosition(dalshe.labelX, dalshe.labelY - 8 + offsetY);
        dalsheSubtitle.setPosition(dalshe.labelX, dalshe.labelY + 9 + offsetY);
      },
    });
    const dalsheLabel = this.label(dalshe.labelX, dalshe.labelY - 8, primaryLabel.toUpperCase(), PALETTE.bgVoid, 2, [0, 0.5]);
    const dalsheSubtitle = this.label(dalshe.labelX, dalshe.labelY + 9, subtitle, PALETTE.bgVoid, 1, [0, 0.5]);

    return [menuBtn, dalshe, dalsheLabel, dalsheSubtitle];
  }
}
