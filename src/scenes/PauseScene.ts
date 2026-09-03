import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';

interface PauseSceneData {
  gameplaySceneKey: string;
  levelId: string;
}

/**
 * Launched on top of a paused `GameplayScene` (never `start`ed standalone —
 * it has nothing to show without a gameplay scene underneath). Every action
 * either resumes or fully replaces the gameplay scene; this scene always
 * ends itself in the process, never lingers.
 */
export class PauseScene extends Phaser.Scene {
  private pauseData!: PauseSceneData;

  constructor() {
    super('PauseScene');
  }

  init(data: PauseSceneData): void {
    this.pauseData = data;
  }

  create(): void {
    const { width, height } = this.scale;

    buildDimBackdrop(this);

    const panelW = 170;
    const panelH = 120;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const g = this.add.graphics();
    drawPanel(g, panelX, panelY, panelW, panelH);

    new PixelLabel(this, width / 2, panelY + 18, t('pauseTitle'), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    const buttonW = panelW - 24;
    const buttonH = 20;
    const gap = 8;
    let y = panelY + 46;

    new PixelButton(this, width / 2, y, t('resume'), {
      width: buttonW,
      height: buttonH,
      textScale: 1,
      onClick: () => this.resume(),
    });
    y += buttonH + gap;

    new PixelButton(this, width / 2, y, t('restart'), {
      width: buttonW,
      height: buttonH,
      textScale: 1,
      onClick: () => this.restart(),
    });
    y += buttonH + gap;

    new PixelButton(this, width / 2, y, t('mainMenu'), {
      width: buttonW,
      height: buttonH,
      textScale: 1,
      onClick: () => this.toMainMenu(),
    });

    this.input.keyboard?.once('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume(this.pauseData.gameplaySceneKey);
  }

  private restart(): void {
    this.scene.stop();
    this.scene.start(this.pauseData.gameplaySceneKey, { levelId: this.pauseData.levelId });
  }

  private toMainMenu(): void {
    this.scene.stop();
    this.scene.stop(this.pauseData.gameplaySceneKey);
    this.scene.start('MainMenuScene');
  }
}
