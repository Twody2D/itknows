import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';

/** Static instructional overlay — launched from the main menu, always ends itself with `scene.stop()` on Back. */
export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super('HowToPlayScene');
  }

  create(): void {
    const { width, height } = this.scale;

    buildDimBackdrop(this);

    const panelW = Math.min(280, width - 40);
    const panelH = 210;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const g = this.add.graphics();
    drawPanel(g, panelX, panelY, panelW, panelH);

    new PixelLabel(this, width / 2, panelY + 18, t('howToPlayTitle'), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    const lines = [
      t('htpMove'),
      t('htpJump'),
      t('htpHazardLine1'),
      t('htpHazardLine2'),
      t('htpSystemLine1'),
      t('htpSystemLine2'),
      t('htpRetry'),
    ];
    let y = panelY + 40;
    for (const line of lines) {
      new PixelLabel(this, panelX + 16, y, line, {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      });
      y += 15;
    }

    new PixelButton(this, width / 2, panelY + panelH - 22, t('back'), {
      width: panelW - 24,
      height: 20,
      onClick: () => this.scene.stop(),
    });
  }
}
