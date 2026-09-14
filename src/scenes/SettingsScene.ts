import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss, lerpColor } from '@/utils/color';
import { t } from '@/i18n/ui';
import { LocaleState } from '@/i18n/Locale';
import { FxSettings } from '@/fx/FxSettings';
import { AudioSettings } from '@/audio/AudioSettings';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import { buildScreenTopbar, buildSectionBand, attachEscape, SCREEN_TOPBAR_H } from '@/ui/ScreenChrome';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { playSfx } from '@/audio/SfxManager';
import { YandexGamesService } from '@/services/YandexGamesService';
import { rebuildOnResize } from '@/ui/relayout';

/**
 * Full-screen settings, rebuilt against Claude Design mockup 4g: two columns
 * of sections, a switch per option instead of a row that reads "ЗВУК: ВКЛ".
 *
 * Where the mockup and this build disagree, the build wins and the screen
 * says so plainly rather than drawing a control with nothing behind it:
 * there are no separate music/SFX volume sliders (audio is one synthesised
 * bus with one mute flag — `AudioSettings`), and there is no "SYSTEM voice"
 * switch (the commentator has no off state; §6 makes it part of the game,
 * not a decoration). Everything drawn here moves a real setting.
 *
 * Launched as an overlay from the main menu or `PauseScene` — always ends
 * itself with `scene.stop()`, never touches whatever is underneath.
 */
export class SettingsScene extends Phaser.Scene {
  private domText!: DomTextOverlay;
  private authorized = false;

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    rebuildOnResize(this);
    const { width, height } = this.scale;

    buildRadialGridBackdrop(this, width, height, 'settings-backdrop', 0.55, 0.3);
    fadeIn(this);

    this.domText = new DomTextOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    buildScreenTopbar(this, this.domText, {
      title: t('settingsTitle'),
      accent: PALETTE.cyan,
      right: `v${__APP_VERSION__}`,
      onBack: () => this.scene.stop(),
    });
    attachEscape(this, () => this.scene.stop());

    // Two columns over the 480px safe zone; a wider canvas only widens them.
    const gutter = 12;
    const colGap = 8;
    const total = Math.min(width - gutter * 2, 596);
    const leftW = Math.round((total - colGap) * 0.5);
    const rightW = total - colGap - leftW;
    const leftX = gutter;
    const rightX = gutter + leftW + colGap;

    // One rhythm both columns keep: band (20) → 6 → row (40) → 6 → row,
    // sections 12 apart. It lands the last row near the bottom edge instead
    // of leaving the lower third of the screen empty.
    const bandH = 20;
    const rowH = 40;
    const afterBand = bandH + 6;
    const nextRow = rowH + 6;
    const top = SCREEN_TOPBAR_H + 8;

    // ---- left column ----------------------------------------------------
    buildSectionBand(this, this.domText, leftX, top, leftW, t('settingsSectionSound'), PALETTE.cyan, PALETTE.cyanDim);
    this.buildToggleRow(leftX, top + afterBand, leftW, rowH, {
      title: t('sound'),
      desc: t('settingsSoundDesc'),
      accent: PALETTE.cyan,
      track: PALETTE.cyanDim,
      value: () => !AudioSettings.muted,
      toggle: () => AudioSettings.toggle(),
      glyph: (g, x, cy) => {
        g.fillRect(x, cy - 3, 5, 6);
        g.fillRect(x + 5, cy - 7, 5, 14);
        g.fillRect(x + 12, cy - 4, 2, 8);
      },
    });

    const pictureY = top + afterBand + rowH + 12;
    buildSectionBand(this, this.domText, leftX, pictureY, leftW, t('settingsSectionPicture'), PALETTE.cyan, PALETTE.cyanDim);
    this.buildToggleRow(leftX, pictureY + afterBand, leftW, rowH, {
      title: t('particles'),
      desc: t('settingsParticlesDesc'),
      accent: PALETTE.cyan,
      track: PALETTE.cyanDim,
      value: () => FxSettings.particlesEnabled,
      toggle: () => {
        FxSettings.particlesEnabled = !FxSettings.particlesEnabled;
      },
      glyph: (g, x, cy) => {
        g.fillRect(x, cy + 2, 3, 3);
        g.fillRect(x + 6, cy - 3, 3, 3);
        g.fillRect(x + 12, cy + 1, 3, 3);
      },
    });
    this.buildToggleRow(leftX, pictureY + afterBand + nextRow, leftW, rowH, {
      title: t('screenShake'),
      desc: t('settingsShakeDesc'),
      accent: PALETTE.cyan,
      track: PALETTE.cyanDim,
      value: () => FxSettings.shakeEnabled,
      toggle: () => {
        FxSettings.shakeEnabled = !FxSettings.shakeEnabled;
      },
      glyph: (g, x, cy) => {
        g.fillRect(x, cy - 5, 2, 10);
        g.fillRect(x + 6, cy - 8, 3, 16);
        g.fillRect(x + 13, cy - 5, 2, 10);
      },
    });

    // ---- right column ---------------------------------------------------
    // The "ИГРА" section used to sit above this with one switch in it — the
    // ghost replay — and went when the ghost did (owner: "давай уберём
    // функцию призрак, мне кажется она бесполезна"). Language starts the
    // column now rather than leaving an empty band where it was.
    const langY = top;
    buildSectionBand(this, this.domText, rightX, langY, rightW, t('settingsSectionLanguage'), PALETTE.cyan, PALETTE.cyanDim);
    this.buildLanguageRow(rightX, langY + afterBand, rightW, rowH);

    // Outside a real Yandex Games hosting `isAvailable()` is always false
    // (dev, CI, this game opened standalone), so the row simply never renders
    // there rather than offering a sign-in button that could never do
    // anything.
    if (!YandexGamesService.isAvailable()) return;
    const accountY = langY + afterBand + nextRow;
    buildSectionBand(this, this.domText, rightX, accountY, rightW, t('settingsSectionAccount'), PALETTE.system, PALETTE.systemDim);
    this.buildAuthRow(rightX, accountY + afterBand, rightW, rowH);
  }

  /** One 36px option row: glyph, name, one line of explanation, and a switch that reads its own live value. */
  private buildToggleRow(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      title: string;
      desc: string;
      accent: number;
      /** The switch's "on" track — the accent's own dark step, so the knob still reads against it. */
      track: number;
      value: () => boolean;
      toggle: () => void;
      glyph: (g: Phaser.GameObjects.Graphics, x: number, cy: number) => void;
    },
  ): void {
    const frame = this.add.graphics();
    frame.fillStyle(PALETTE.metalDark, 1);
    frame.fillRect(x, y, w, h);
    frame.lineStyle(1, PALETTE.metalMid, 1);
    frame.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const glyph = this.add.graphics();
    glyph.fillStyle(opts.accent, 1);
    opts.glyph(glyph, x + 8, y + h / 2);

    this.domText.add(
      x + 30,
      y + h / 2 - 7,
      opts.title,
      {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 12,
        bold: true,
        uppercase: true,
      },
      0,
      0.5,
    );
    this.domText.add(
      x + 30,
      y + h / 2 + 7,
      opts.desc,
      { color: hexToCss(PALETTE.labelMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 9, bold: true },
      0,
      0.5,
    );

    // A SWITCH THAT ACTUALLY SLIDES.
    //
    // The knob always sat on the correct side, but it jumped there in the
    // same frame the colours changed, and a 14px jump under a simultaneous
    // recolour does not read as movement at all — the owner saw only the
    // colour ("логичнее будет при переключении тумблера чтобы он не только
    // менял цвет включен/выключен, но и тумблер передвигался влево/вправо").
    // Now `slide` runs 0 -> 1 over 130ms and every part of the switch is
    // drawn from it, track and border colours included, so the two halves
    // of the change happen together and at a speed the eye can follow.
    const swW = 32;
    const swH = 16;
    const swX = x + w - 8 - swW;
    const swY = y + (h - swH) / 2;
    const travel = swW - 2 - 14;
    const sw = this.add.graphics();
    const slide = { t: opts.value() ? 1 : 0 };
    const paint = (): void => {
      sw.clear();
      sw.fillStyle(lerpColor(PALETTE.metalMid, opts.track, slide.t), 1);
      sw.fillRect(swX, swY, swW, swH);
      sw.lineStyle(1, lerpColor(PALETTE.metalEdge, opts.accent, slide.t), 1);
      sw.strokeRect(swX + 0.5, swY + 0.5, swW - 1, swH - 1);
      sw.fillStyle(lerpColor(PALETTE.textDisabled, opts.accent, slide.t), 1);
      sw.fillRect(Math.round(swX + 1 + travel * slide.t), swY + 1, 14, 14);
    };
    paint();

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      playSfx('uiClick');
      opts.toggle();
      this.tweens.killTweensOf(slide);
      this.tweens.add({
        targets: slide,
        t: opts.value() ? 1 : 0,
        duration: 130,
        ease: 'Quad.easeOut',
        onUpdate: paint,
        onComplete: paint,
      });
    });
  }

  private buildLanguageRow(x: number, y: number, w: number, h: number): void {
    const gap = 6;
    const halfW = Math.floor((w - gap) / 2);
    const options: { locale: 'ru' | 'en'; label: string }[] = [
      { locale: 'ru', label: t('settingsLangRu') },
      { locale: 'en', label: t('settingsLangEn') },
    ];

    options.forEach((option, i) => {
      const bx = x + i * (halfW + gap);
      const active = LocaleState.current === option.locale;

      const g = this.add.graphics();
      g.fillStyle(active ? PALETTE.panelHover : PALETTE.metalDark, 1);
      g.fillRect(bx, y, halfW, h);
      g.lineStyle(active ? 2 : 1, active ? PALETTE.cyan : PALETTE.metalEdge, 1);
      g.strokeRect(bx + 1, y + 1, halfW - 2, h - 2);

      this.domText.add(
        bx + halfW / 2,
        y + h / 2,
        option.label,
        {
          color: hexToCss(active ? PALETTE.white : PALETTE.labelMuted),
          strokeColor: hexToCss(PALETTE.outline),
          sizePx: 14,
          bold: true,
        },
        0.5,
        0.5,
      );

      if (active) return;
      const zone = this.add.zone(bx + halfW / 2, y + h / 2, halfW, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        playSfx('uiClick');
        LocaleState.set(option.locale);
        // Every label on this screen (title included) is now in the wrong
        // language, so the whole screen re-renders rather than a subset.
        this.scene.restart();
      });
    });
  }

  private buildAuthRow(x: number, y: number, w: number, h: number): void {
    const frame = this.add.graphics();
    frame.fillStyle(PALETTE.metalDark, 1);
    frame.fillRect(x, y, w, h);
    frame.lineStyle(1, PALETTE.systemDim, 1);
    frame.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const status = this.domText.add(
      x + 10,
      y + h / 2,
      t('yandexIdGuest'),
      { color: hexToCss(PALETTE.textMuted), strokeColor: hexToCss(PALETTE.outline), sizePx: 11, bold: true },
      0,
      0.5,
    );

    const action = this.domText.add(
      x + w - 10,
      y + h / 2,
      t('settingsSignIn'),
      { color: hexToCss(PALETTE.system), strokeColor: hexToCss(PALETTE.outline), sizePx: 11, bold: true },
      1,
      0.5,
    );

    const applyState = (): void => {
      status.setText(this.authorized ? t('yandexIdSignedIn') : t('yandexIdGuest'));
      action.setVisible(!this.authorized);
    };

    void YandexGamesService.isPlayerAuthorized().then((ok) => {
      this.authorized = ok;
      applyState();
    });
    applyState();

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      // No sign-out path exists (the SDK has none) — once signed in, the row
      // is a status display, not a button.
      if (this.authorized) return;
      playSfx('uiClick');
      void YandexGamesService.requestAuthorization().then((ok) => {
        this.authorized = ok;
        applyState();
      });
    });
  }
}
