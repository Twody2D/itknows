import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { formatMmSs } from '@/utils/formatTime';
import { PixelButton } from '@/ui/PixelButton';
import { DomTextOverlay, type DomTextHandle, type DomTextOptions } from '@/ui/DomTextOverlay';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { rebuildOnResize } from '@/ui/relayout';
import { getLevel } from '@/gameplay/LevelFactory';
import { currentChallengeTimeMs } from '@/gameplay/DailyChallenge';
import { DAILY_LIVES, SaveService } from '@/services/SaveService';
import { LeaderboardService } from '@/services/LeaderboardService';
import { YandexGamesService, type YsdkLeaderboardEntry } from '@/services/YandexGamesService';
import { AdsService } from '@/services/AdsService';
import type { DailyRunState } from './GameplayScene';

export interface DailyResultData {
  date: string;
  levelId: string;
  /** `cleared` — reached the exit; `out-of-lives` — the run ended without it. */
  outcome: 'cleared' | 'out-of-lives';
  timeMs: number;
  deaths: number;
}

const REVEAL_MS = 260;

/**
 * Where a Daily Challenge run ends (master-prompt §74) — time, deaths,
 * today's best, the level's board, and the clock to the next challenge.
 *
 * It exists because a daily run is NOT a campaign level: before this screen
 * a cleared challenge fell through the campaign's own completion path, which
 * marked the level finished, moved where PLAY resumes, and walked the player
 * into the next level of a sector they may never have reached. The run's own
 * rules live in `GameplayScene` (`DailyRunState`); this is where they are
 * reported and where the day's one rewarded continue is offered.
 *
 * The board shown is the level's own. The daily is that same level in the
 * same shape as the campaign's — the adaptive variants are gone — so its
 * time is comparable with every other time posted on it, and no per-date
 * leaderboard has to exist server-side (Yandex boards are created by hand in
 * the developer console and cannot be made per day from client code, see
 * `LeaderboardService`).
 */
export class DailyResultScene extends Phaser.Scene {
  private result!: DailyResultData;
  private domText!: DomTextOverlay;
  private boardBody!: Phaser.GameObjects.Container;
  private boardLabels: DomTextHandle[] = [];
  private countdownLabel: DomTextHandle | null = null;

  constructor() {
    super('DailyResultScene');
  }

  init(data: DailyResultData): void {
    this.result = data;
  }

  create(): void {
    rebuildOnResize(this, this.result);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    fadeIn(this);
    buildRadialGridBackdrop(this, width, height, 'daily-backdrop', 0.5, 0.2);

    // The scene instance is reused across restarts (a resize rebuilds it),
    // so anything held from the previous run points at destroyed objects.
    this.boardLabels = [];
    this.countdownLabel = null;
    this.domText = new DomTextOverlay(this, 20);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    const reveal: Phaser.GameObjects.GameObject[] = [
      this.buildBanner(width),
      this.buildRunBlock(),
      this.buildBestBlock(),
      this.buildBoardPanel(),
    ];
    const buttons = this.buildButtons();

    // One motion for the whole screen, for the reason `SectorCompleteScene`
    // documents at length: every word here is DOM text on a single layer,
    // and that layer can only fade as one piece.
    const targets = [...reveal, ...buttons] as unknown as Array<{ alpha: number }>;
    for (const target of targets) target.alpha = 0;
    this.tweens.add({ targets, alpha: 1, duration: REVEAL_MS, ease: 'Sine.easeOut' });
    this.domText.fadeInLayer(REVEAL_MS);

    this.startCountdown();
    void this.loadBoard();
  }

  // ---- type ------------------------------------------------------------

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

  private prose(
    x: number,
    y: number,
    text: string,
    color: number,
    sizePx: number,
    origin: [number, number] = [0, 0],
  ): DomTextHandle {
    return this.domText.add(x, y, text, { color: hexToCss(color), sizePx, bold: true }, origin[0], origin[1]);
  }

  private panel(
    x: number,
    y: number,
    w: number,
    h: number,
    borderColor: number,
    fillColor: number = PALETTE.metalDark,
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, borderColor, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return g;
  }

  // ---- blocks ----------------------------------------------------------

  private buildBanner(width: number): Phaser.GameObjects.Container {
    const cleared = this.result.outcome === 'cleared';
    const accent = cleared ? PALETTE.cyan : PALETTE.dangerAlt;
    const container = this.add.container(0, 0);

    const bar = this.add.graphics();
    bar.fillStyle(PALETTE.bgIndigo, 1);
    bar.fillRect(0, 10, width, 34);
    bar.fillStyle(accent, 1);
    bar.fillRect(0, 10, 3, 34);
    container.add(bar);

    this.mono(16, 21, t('dailyChallenge'), accent, 11, [0, 0.5]);
    this.prose(16, 36, cleared ? t('dailyResultCleared') : t('dailyResultFailed'), PALETTE.white, 15, [0, 0.5]);
    const subject = this.result.date + ' · ' + getLevel(this.result.levelId).name;
    this.mono(width - 16, 27, subject, PALETTE.labelMuted, 10, [1, 0.5]);
    return container;
  }

  private buildRunBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 56, 216, 62, PALETTE.metalEdge, PALETTE.bgGraphite));

    this.mono(28, 72, t('resultTime'), PALETTE.labelMuted, 10, [0, 0.5]);
    this.mono(220, 72, formatMmSs(this.result.timeMs), PALETTE.cyan, 16, [1, 0.5]);
    this.mono(28, 100, t('resultDeaths'), PALETTE.labelMuted, 10, [0, 0.5]);
    this.mono(220, 100, String(this.result.deaths), PALETTE.dangerAlt, 16, [1, 0.5]);
    return container;
  }

  private buildBestBlock(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(16, 126, 216, 44, PALETTE.metalEdge, PALETTE.bgGraphite));

    const daily = SaveService.getDaily(this.result.date);
    this.mono(28, 140, t('dailyBestToday'), PALETTE.labelMuted, 10, [0, 0.5]);
    if (daily.bestTimeMs === null) {
      this.mono(28, 158, t('dailyNoResultYet'), PALETTE.textDisabled, 11, [0, 0.5]);
    } else {
      this.mono(28, 158, formatMmSs(daily.bestTimeMs), PALETTE.reward, 13, [0, 0.5]);
      const deaths = t('resultDeaths') + ' ' + String(daily.bestDeaths ?? 0);
      this.mono(220, 158, deaths, PALETTE.labelMuted, 10, [1, 0.5]);
    }
    return container;
  }

  private buildBoardPanel(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.add(this.panel(248, 56, 216, 114, PALETTE.metalEdge, PALETTE.bgGraphite));

    const header = this.add.graphics();
    header.fillStyle(PALETTE.bgIndigo, 1);
    header.fillRect(248, 56, 216, 18);
    container.add(header);
    this.mono(256, 65, t('resultLeaderboardTitle'), PALETTE.cyan, 10, [0, 0.5]);

    this.boardBody = this.add.container(0, 0);
    container.add(this.boardBody);
    return container;
  }

  private clearBoard(): void {
    this.boardBody.removeAll(true);
    for (const label of this.boardLabels) label.destroy();
    this.boardLabels = [];
  }

  private async loadBoard(): Promise<void> {
    this.clearBoard();
    if (!YandexGamesService.isAvailable()) {
      this.boardLabels.push(this.mono(356, 122, t('resultLeaderboardOffline'), PALETTE.labelMuted, 10, [0.5, 0.5]));
      return;
    }

    let entries: YsdkLeaderboardEntry[] = [];
    try {
      entries = await LeaderboardService.getLevelEntries(this.result.levelId, 4);
    } catch {
      entries = [];
    }
    // The scene can be torn down while this promise is in flight — a button
    // press or a resize rebuild — and `boardBody` then belongs to a
    // destroyed scene.
    if (!this.scene.isActive() || !this.boardBody.scene) return;

    if (entries.length === 0) {
      this.boardLabels.push(this.mono(356, 122, t('resultLeaderboardOffline'), PALETTE.labelMuted, 10, [0.5, 0.5]));
      return;
    }
    entries.slice(0, 4).forEach((entry, i) => {
      const y = 76 + i * 22;
      const stripe = this.add
        .rectangle(248, y, 216, 22, i % 2 === 0 ? PALETTE.bgVoid : PALETTE.metalDark, 0.5)
        .setOrigin(0, 0);
      this.boardBody.add(stripe);
      this.boardLabels.push(
        this.mono(258, y + 11, String(entry.rank), PALETTE.labelMuted, 10, [0, 0.5]),
        this.mono(280, y + 11, entry.player.publicName.slice(0, 12), PALETTE.white, 10, [0, 0.5], { uppercase: false }),
        this.mono(452, y + 11, formatMmSs(entry.score), PALETTE.cyan, 10, [1, 0.5]),
      );
    });
  }

  /**
   * Live countdown to the next UTC challenge, off the same clock
   * `getDailyChallenge` keys on — so this screen and the menu's own card can
   * never disagree about when the day turns over.
   */
  private startCountdown(): void {
    const render = (): string => t('dailyNextIn') + ' ' + this.timeToReset();
    this.countdownLabel = this.mono(16, 184, render(), PALETTE.labelMuted, 10, [0, 0.5]);
    const timer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(render()),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => timer.remove());
  }

  private timeToReset(): string {
    const now = currentChallengeTimeMs();
    const utc = new Date(now);
    const nextUtcMidnight = Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate() + 1);
    const left = Math.max(nextUtcMidnight - now, 0);
    const hours = Math.floor(left / 3_600_000);
    const minutes = Math.floor((left % 3_600_000) / 60_000);
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  // ---- buttons ---------------------------------------------------------

  private startRun(livesLeft: number): void {
    this.scene.start('GameplayScene', {
      levelId: this.result.levelId,
      entryTransition: true,
      daily: { date: this.result.date, livesLeft } satisfies DailyRunState,
    });
  }

  private textButton(x: number, label: string, onClick: () => void): Phaser.GameObjects.GameObject {
    const text = this.prose(x, 226, label, PALETTE.cyan, 13, [0.5, 0.5]);
    return new PixelButton(this, x, 226, label, {
      width: 108,
      height: 34,
      variant: 'secondary',
      hideLabel: true,
      onLabelState: ({ color, offsetY }) => {
        text.setColor(hexToCss(color));
        text.setPosition(x, 226 + offsetY);
      },
      onClick,
    });
  }

  private buildButtons(): Phaser.GameObjects.GameObject[] {
    const buttons: Phaser.GameObjects.GameObject[] = [
      this.textButton(78, t('resultMenu'), () => this.scene.start('MainMenuScene')),
      // A fresh run: the whole point of the life limit is that the clock
      // starts over with it.
      this.textButton(198, t('dailyRetry'), () => this.startRun(DAILY_LIVES)),
    ];

    // The continue is offered only where it means something: the run ended
    // for want of a life, the day's one continue is unspent, and ads can
    // actually pay out (a player who bought "no ads" is shown nothing rather
    // than a button that cannot deliver).
    const ranOut = this.result.outcome === 'out-of-lives';
    const hasContinue = SaveService.canUseDailyContinue(this.result.date);
    if (ranOut && hasContinue && !AdsService.isAdsDisabled()) {
      buttons.push(this.buildContinueButton());
    } else if (ranOut && !hasContinue) {
      this.mono(368, 226, t('dailyContinueSpent'), PALETTE.textDisabled, 9, [0.5, 0.5]);
    }
    return buttons;
  }

  private buildContinueButton(): Phaser.GameObjects.GameObject {
    const label = this.prose(368, 220, t('dailyContinue'), PALETTE.bgVoid, 13, [0.5, 0.5]);
    const hint = this.mono(368, 235, t('dailyContinueHint'), PALETTE.bgVoid, 9, [0.5, 0.5]);
    const button: PixelButton = new PixelButton(this, 368, 226, t('dailyContinue'), {
      width: 152,
      height: 34,
      variant: 'primary',
      hideLabel: true,
      onLabelState: ({ color, offsetY }) => {
        label.setColor(hexToCss(color));
        hint.setColor(hexToCss(color));
        label.setPosition(368, 220 + offsetY);
        hint.setPosition(368, 235 + offsetY);
      },
      onClick: () => {
        // Spent BEFORE the ad plays, and only if the day still had one: the
        // allowance is enforced by the save, never by whether this button
        // happened to be on screen. Handed back below if nothing was
        // actually watched — an ad that fails to play owes the player
        // nothing and costs them nothing (CLAUDE.md #8).
        if (!SaveService.useDailyContinue(this.result.date)) return;
        AdsService.requestRewarded((granted) => {
          if (granted) {
            this.startRun(1);
            return;
          }
          SaveService.refundDailyContinue(this.result.date);
          this.mono(368, 250, t('dailyContinueUnavailable'), PALETTE.dangerAlt, 9, [0.5, 0.5]);
        });
      },
    });
    return button;
  }
}
