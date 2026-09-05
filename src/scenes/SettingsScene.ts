import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { LocaleState } from '@/i18n/Locale';
import { FxSettings } from '@/fx/FxSettings';
import { AudioSettings } from '@/audio/AudioSettings';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';
import { YandexGamesService } from '@/services/YandexGamesService';

/**
 * Launched as an overlay from the main menu or from `PauseScene` — always
 * ends itself with `scene.stop()` on Back, never touches whatever scene is
 * underneath. Every toggle here writes straight to the live settings module
 * (`FxSettings`, `LocaleState`) so effects already in flight (e.g. a
 * `GameplayScene` paused underneath) pick the new value up immediately,
 * with nothing scene-specific to wire.
 */
export class SettingsScene extends Phaser.Scene {
  private soundButton!: PixelButton;
  private particlesButton!: PixelButton;
  private shakeButton!: PixelButton;
  private authButton: PixelButton | null = null;
  private authorized = false;

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    const { width, height } = this.scale;

    buildDimBackdrop(this);

    // Outside a real Yandex Games hosting `isAvailable()` is always false
    // (dev, CI, this game opened standalone — see `YandexGamesService`'s own
    // doc comment on why), so the row simply never renders there rather than
    // offering a sign-in button that could never do anything.
    const showAuthRow = YandexGamesService.isAvailable();

    const panelW = 190;
    const panelH = 176 + (showAuthRow ? 28 : 0);
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const g = this.add.graphics();
    drawPanel(g, panelX, panelY, panelW, panelH);

    new PixelLabel(this, width / 2, panelY + 18, t('settingsTitle'), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    const rowW = panelW - 24;
    const rowH = 20;
    const gap = 8;
    let y = panelY + 46;

    this.soundButton = new PixelButton(this, width / 2, y, this.soundLabel(), {
      width: rowW,
      height: rowH,
      textScale: 1,
      onClick: () => {
        AudioSettings.toggle();
        this.soundButton.setLabelText(this.soundLabel());
      },
    });
    y += rowH + gap;

    this.particlesButton = new PixelButton(this, width / 2, y, this.particlesLabel(), {
      width: rowW,
      height: rowH,
      textScale: 1,
      onClick: () => {
        FxSettings.particlesEnabled = !FxSettings.particlesEnabled;
        this.particlesButton.setLabelText(this.particlesLabel());
      },
    });
    y += rowH + gap;

    this.shakeButton = new PixelButton(this, width / 2, y, this.shakeLabel(), {
      width: rowW,
      height: rowH,
      textScale: 1,
      onClick: () => {
        FxSettings.shakeEnabled = !FxSettings.shakeEnabled;
        this.shakeButton.setLabelText(this.shakeLabel());
      },
    });
    y += rowH + gap;

    new PixelButton(this, width / 2, y, this.languageLabel(), {
      width: rowW,
      height: rowH,
      textScale: 1,
      onClick: () => {
        LocaleState.set(LocaleState.current === 'ru' ? 'en' : 'ru');
        this.refreshAllLabels();
      },
    });
    y += rowH + gap;

    if (showAuthRow) {
      this.authButton = new PixelButton(this, width / 2, y, this.authLabel(), {
        width: rowW,
        height: rowH,
        textScale: 1,
        onClick: () => {
          // No sign-out path exists (the SDK has none) — once signed in,
          // the row is a status display, not a button, matching master
          // prompt §41's "conscious action" gate having exactly one direction.
          if (this.authorized) return;
          void YandexGamesService.requestAuthorization().then((ok) => {
            this.authorized = ok;
            this.authButton?.setLabelText(this.authLabel());
          });
        },
      });
      y += rowH + gap;
      void this.refreshAuthStatus();
    }

    new PixelButton(this, width / 2, y, t('back'), {
      width: rowW,
      height: rowH,
      textScale: 1,
      onClick: () => this.scene.stop(),
    });
  }

  private authLabel(): string {
    return this.authorized ? t('yandexIdSignedIn') : t('yandexIdGuest');
  }

  private async refreshAuthStatus(): Promise<void> {
    this.authorized = await YandexGamesService.isPlayerAuthorized();
    this.authButton?.setLabelText(this.authLabel());
  }

  private soundLabel(): string {
    return `${t('sound')}: ${AudioSettings.muted ? t('off') : t('on')}`;
  }

  private particlesLabel(): string {
    return `${t('particles')}: ${FxSettings.particlesEnabled ? t('on') : t('off')}`;
  }

  private shakeLabel(): string {
    return `${t('screenShake')}: ${FxSettings.shakeEnabled ? t('on') : t('off')}`;
  }

  private languageLabel(): string {
    return `${t('language')}: ${LocaleState.current.toUpperCase()}`;
  }

  /** Switching language mid-screen means every label on this screen (including the title) needs to re-render, not just the toggle rows. */
  private refreshAllLabels(): void {
    this.scene.restart();
  }
}
