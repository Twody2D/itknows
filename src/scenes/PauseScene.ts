import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { DomTextOverlay, type DomTextHandle, type DomTextOptions } from '@/ui/DomTextOverlay';
import { GameState } from '@/core/GameState';
import { SaveService } from '@/services/SaveService';
import { sectorIdOf } from '@/gameplay/sectors';
import { AudioSettings } from '@/audio/AudioSettings';
import { FxSettings } from '@/fx/FxSettings';
import { playSfx } from '@/audio/SfxManager';
import { formatMmSsTenths } from '@/utils/formatTime';
import { rebuildOnResize } from '@/ui/relayout';
import { addPlayTriangle } from '@/ui/glyphs';

interface PauseSceneData {
  gameplaySceneKey: string;
  levelId: string;
}

/** Mockup 5a/5b: card height and vertical rhythm never change with width. */
const CARD_Y = 30;
const CARD_H = 210;
const HEADER_H = 28;
/** The button column is the one thing that never shrinks — the mockup's single layout rule. */
const COL_W = 236;
/**
 * Narrowest the card may be: the button column plus the gap and the narrowest
 * useful right column, which is what a 480px canvas resolves to.
 */
const CARD_MIN_W = 456;

/**
 * Launched on top of a paused `GameplayScene` (never `start`ed standalone —
 * it has nothing to show without a gameplay scene underneath). Every action
 * either resumes or fully replaces the gameplay scene; this scene always
 * ends itself in the process, never lingers.
 *
 * Laid out from mockup 5a/5b, which is the first screen the design gives at
 * all three reference widths. Its single rule: the action column is fixed at
 * `COL_W` and never shrinks, the stats column takes whatever is left.
 */
export class PauseScene extends Phaser.Scene {
  private pauseData!: PauseSceneData;
  private domText!: DomTextOverlay;
  private cardX = 0;
  private cardW = 0;

  constructor() {
    super('PauseScene');
  }

  init(data: PauseSceneData): void {
    this.pauseData = data;
  }

  create(): void {
    rebuildOnResize(this, this.pauseData);
    const { width, height } = this.scale;

    // cardW = max(456, W - 80), centred. The spec's prose states this as
    // `min(540, W - 24)`, but that contradicts its own table and drawing at
    // 550, which show a 470-wide card inset by 40 rather than 526 inset by
    // 12. The form below reproduces all three drawn widths exactly:
    // 620 -> 540 at 40, 550 -> 470 at 40, 480 -> 456 at 12.
    this.cardW = Math.max(CARD_MIN_W, width - 80);
    this.cardX = Math.round((width - this.cardW) / 2);

    this.domText = new DomTextOverlay(this, 30);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    const dim = this.add.graphics();
    dim.fillStyle(PALETTE.bgVoid, 0.82);
    dim.fillRect(0, 0, width, height);

    const card = this.add.graphics();
    card.fillStyle(PALETTE.metalDark, 1);
    card.fillRect(this.cardX, CARD_Y, this.cardW, CARD_H);
    card.lineStyle(1, PALETTE.cyanDim, 1);
    card.strokeRect(this.cardX + 0.5, CARD_Y + 0.5, this.cardW - 1, CARD_H - 1);

    this.buildHeader();
    this.buildActions();
    this.buildStats();

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === 'Escape' || key === 'p') this.resume();
      else if (key === 'r') this.restart();
    });
  }

  // ---- helpers -----------------------------------------------------------

  private label(
    x: number,
    y: number,
    text: string,
    color: number,
    extra: Partial<DomTextOptions>,
    originX = 0,
    originY = 0.5,
  ): DomTextHandle {
    return this.domText.add(x, y, text, { color: hexToCss(color), ...extra }, originX, originY);
  }

  /** The mockup's technical face — every counter, token and SYSTEM line. */
  private mono(
    x: number,
    y: number,
    text: string,
    color: number,
    sizePx: number,
    extra: Partial<DomTextOptions> = {},
    originX = 0,
  ): DomTextHandle {
    return this.label(x, y, text, color, { font: 'pixel', sizePx, uppercase: true, ...extra }, originX, 0.5);
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      playSfx('uiClick');
      onClick();
    });
  }

  private box(x: number, y: number, w: number, h: number, fill: number, border: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, border, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /**
   * Rendered width of `text` in the style it will actually be drawn in,
   * measured off a throwaway label parked off-screen.
   *
   * Every "does the long phrase fit here" decision on this screen asks this
   * rather than comparing the canvas width against a breakpoint. The spec
   * gives its rules as canvas-width thresholds ("at 620 the full line, at
   * 550-520 the short one") because it only had three widths to describe;
   * applied literally they misjudge every width in between — a 598px canvas
   * has 256px of room for a line that needs 172px, and would still have been
   * handed the short one.
   */
  private textWidth(text: string, style: Partial<DomTextOptions>): number {
    const probe = this.domText.add(-1000, -1000, text, { color: 'transparent', ...style }, 0, 0);
    const measured = probe.width;
    probe.destroy();
    return measured;
  }

  // ---- header ------------------------------------------------------------

  private buildHeader(): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgIndigo, 1);
    g.fillRect(this.cardX, CARD_Y, this.cardW, HEADER_H);
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(this.cardX, CARD_Y + HEADER_H - 1, this.cardW, 1);
    // The pause glyph is two bars — a primitive, not a sprite.
    g.fillStyle(PALETTE.cyan, 1);
    g.fillRect(this.cardX + 8, CARD_Y + 7, 4, 14);
    g.fillRect(this.cardX + 15, CARD_Y + 7, 4, 14);

    this.mono(this.cardX + 27, CARD_Y + 14, t('pauseTitle'), PALETTE.white, 18, { bold: true, letterSpacing: 2 });

    // Untranslated technical token, like every other SYSTEM readout (CLAUDE.md #7).
    const sector = sectorIdOf(this.pauseData.levelId).replace('sector-', 'SECTOR ');
    this.mono(this.cardX + this.cardW - 8, CARD_Y + 14, sector, PALETTE.labelMuted, 10, { letterSpacing: 1 }, 1);
  }

  // ---- left column: three actions at three visual weights ------------------

  private buildActions(): void {
    const x = this.cardX + 8;

    // Resume is the only light object on the screen — it can be hit without
    // reading anything, which is the point of the three-weight ladder.
    const primary = this.add.graphics();
    primary.fillStyle(PALETTE.cyanDim, 1);
    primary.fillRect(x, 122, COL_W, 4);
    primary.fillGradientStyle(PALETTE.cyanBright, PALETTE.cyanBright, PALETTE.cyan, PALETTE.cyan, 1);
    primary.fillRect(x, 66, COL_W, 56);
    primary.lineStyle(2, PALETTE.white, 1);
    primary.strokeRect(x + 1, 67, COL_W - 2, 54);
    addPlayTriangle(this.domText, x + 23, 94, 18, 24, hexToCss(PALETTE.bgVoid));
    // 20px, not the 24px a first pass would reach for: the spec measured the
    // word at 185px there, against a 232px content box already spending 42px
    // on padding, arrow and gap — the last letter clipped.
    this.label(x + 42, 94, t('resume'), PALETTE.bgVoid, { sizePx: 20, bold: true, uppercase: true });
    this.hit(x, 66, COL_W, 56, () => this.resume());

    this.box(x, 134, COL_W, 44, PALETTE.metalMid, PALETTE.metalEdge);
    const sole = this.add.graphics();
    sole.fillStyle(PALETTE.metalDark, 1);
    sole.fillRect(x, 176, COL_W, 2);
    const arrow = this.add.graphics();
    arrow.fillStyle(PALETTE.cyan, 1);
    arrow.fillRect(x + 12, 148, 16, 3);
    arrow.fillRect(x + 12, 148, 3, 10);
    arrow.fillRect(x + 12, 161, 16, 3);
    arrow.fillRect(x + 25, 154, 3, 10);
    this.label(x + 38, 149, t('restart'), PALETTE.white, { sizePx: 15, bold: true, uppercase: true, lineHeight: 1.05 });
    this.label(x + 38, 164, t('pauseRestartNote'), PALETTE.labelMuted, { sizePx: 10, lineHeight: 1.1 });
    this.hit(x, 134, COL_W, 44, () => this.restart());

    // The darkest step. Leaving costs the run, so it must not look like
    // something the screen is offering.
    this.box(x, 186, COL_W, 32, PALETTE.bgGraphite, PALETTE.metalMid);
    const door = this.add.graphics();
    door.fillStyle(PALETTE.labelMuted, 1);
    door.fillRect(x + 12, 196, 14, 2);
    door.fillRect(x + 12, 196, 2, 12);
    door.fillRect(x + 24, 196, 2, 12);
    door.fillRect(x + 12, 204, 14, 4);
    this.label(x + 36, 202, t('mainMenu'), PALETTE.textMuted, { sizePx: 13, bold: true, uppercase: true });
    this.hit(x, 186, COL_W, 32, () => this.toMainMenu());
  }

  // ---- right column: the numbers a restart decision is made on -------------

  private buildStats(): void {
    const x = this.cardX + 8 + COL_W + 10;
    const w = this.cardX + this.cardW - 8 - x;
    const half = Math.floor((w - 8) / 2);
    const rightX = x + w - half;

    this.box(x, 66, w, 44, PALETTE.bgGraphite, PALETTE.cyanDim);
    const clock = formatMmSsTenths(GameState.elapsedMs());
    const clockLabel = t('pauseAttemptTime');
    const oneLine =
      this.textWidth(clockLabel, { font: 'pixel', sizePx: 11, uppercase: true, letterSpacing: 1 }) +
        this.textWidth(clock, { font: 'pixel', sizePx: 24, bold: true, uppercase: true }) +
        28 <=
      w;
    if (oneLine) {
      this.mono(x + 10, 88, clockLabel, PALETTE.labelMuted, 11, { letterSpacing: 1 });
      this.mono(x + w - 10, 88, clock, PALETTE.cyan, 24, { bold: true, lineHeight: 1 }, 1);
    } else {
      this.mono(x + 10, 79, clockLabel, PALETTE.labelMuted, 10, { letterSpacing: 1 });
      this.mono(x + 10, 96, clock, PALETTE.cyan, 20, { bold: true, lineHeight: 1 });
    }

    // Attempts so far: this run's deaths plus the one being played now.
    this.box(x, 118, half, 40, PALETTE.bgGraphite, PALETTE.metalEdge);
    this.mono(x + 8, 130, t('pauseAttempts'), PALETTE.labelMuted, 9, { letterSpacing: 1 });
    const pip = this.add.graphics();
    pip.lineStyle(2, PALETTE.dangerAlt, 1);
    pip.strokeRect(x + 10, 143, 7, 7);
    this.mono(x + 23, 146, String(GameState.run.deaths + 1), PALETTE.dangerAlt, 14, { bold: true, lineHeight: 1 });

    this.box(rightX, 118, half, 40, PALETTE.bgGraphite, PALETTE.goldDim);
    // The full label needs ~107px at 9px. Below that the spec names a
    // written-out short form rather than clipping it with an ellipsis.
    const bestStyle = { font: 'pixel' as const, sizePx: 9, uppercase: true, letterSpacing: 1 };
    const bestFull = t('levelsSectorBest');
    const bestLabel = this.textWidth(bestFull, bestStyle) <= half - 16 ? bestFull : t('pauseBestShort');
    this.mono(rightX + 8, 130, bestLabel, PALETTE.goldSole, 9, { letterSpacing: 1 });
    const bestMs = SaveService.getSectorBestMs(sectorIdOf(this.pauseData.levelId));
    this.mono(rightX + 8, 146, bestMs === null ? '--:--.-' : formatMmSsTenths(bestMs), PALETTE.reward, 14, {
      bold: true,
      lineHeight: 1,
    });

    // The mockup pairs МУЗЫКА with ЭФФЕКТЫ, but the game has a single audio
    // switch and no music layer to split off it (`AudioSettings` says so in
    // its own comment). Rather than draw a control that would toggle nothing,
    // the second slot carries screen shake — which is the very toggle the
    // mockup itself moves into this card at narrow widths.
    this.buildToggle(x, 166, half, t('sound'), () => !AudioSettings.muted, () => AudioSettings.toggle());
    this.buildToggle(rightX, 166, half, t('pauseShakeShort'), () => FxSettings.shakeEnabled, () => {
      FxSettings.shakeEnabled = !FxSettings.shakeEnabled;
    });

    // SYSTEM's line is the first thing to go: it is flavour, and once even the
    // short phrase needs more than one line the slot is dropped outright.
    const sysStyle = { font: 'pixel' as const, sizePx: 11, uppercase: true, letterSpacing: 0, lineHeight: 1.5 };
    const budget = w - 18;
    const sysLine = [t('pauseSystemLine'), t('pauseSystemLineShort')].find(
      (candidate) => this.textWidth(candidate, sysStyle) <= budget,
    );
    if (sysLine === undefined) return;
    const band = this.add.graphics();
    band.fillStyle(PALETTE.systemDim, 0.3);
    band.fillRect(x, 198, w, 20);
    band.fillStyle(PALETTE.system, 1);
    band.fillRect(x, 198, 2, 20);
    this.mono(x + 9, 208, sysLine, PALETTE.systemLight, 11, { letterSpacing: 0, lineHeight: 1.5 });
  }

  private buildToggle(x: number, y: number, w: number, title: string, value: () => boolean, toggle: () => void): void {
    this.box(x, y, w, 24, PALETTE.bgGraphite, PALETTE.metalMid);
    this.label(x + 6, y + 12, title, PALETTE.white, { sizePx: 10, bold: true, uppercase: true });

    const trackW = w >= 120 ? 26 : 20;
    const knob = w >= 120 ? 12 : 10;
    const trackX = x + w - 6 - trackW;
    const trackY = y + 12 - Math.round((knob + 2) / 2);
    const g = this.add.graphics();
    const paint = (): void => {
      g.clear();
      const on = value();
      g.fillStyle(on ? PALETTE.cyanDim : PALETTE.metalMid, 1);
      g.fillRect(trackX, trackY, trackW, knob + 2);
      g.fillStyle(on ? PALETTE.cyan : PALETTE.textDisabled, 1);
      g.fillRect(on ? trackX + trackW - knob - 1 : trackX + 1, trackY + 1, knob, knob);
    };
    paint();
    this.hit(x, y, w, 24, () => {
      toggle();
      paint();
    });
  }

  // ---- actions -----------------------------------------------------------

  private resume(): void {
    this.scene.stop();
    this.scene.resume(this.pauseData.gameplaySceneKey);
  }

  private restart(): void {
    this.scene.stop();
    // A manual restart is a fresh attempt at this level, same as arriving on
    // it for the first time — `GameplayScene.create()` only calls
    // `GameState.startRun()` when `currentLevelId` actually changes, which it
    // doesn't here (same level), so the deaths counter and run timer would
    // otherwise silently carry over. Without this the HUD looks unchanged
    // after "Заново", which is what made it read as identical to "Продолжить".
    GameState.startRun();
    this.scene.start(this.pauseData.gameplaySceneKey, { levelId: this.pauseData.levelId });
  }

  private toMainMenu(): void {
    this.scene.stop();
    this.scene.stop(this.pauseData.gameplaySceneKey);
    this.scene.start('MainMenuScene');
  }
}
