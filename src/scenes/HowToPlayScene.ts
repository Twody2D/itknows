import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { buildKeyRow } from '@/ui/KeyCap';
import { jumpHintKeys, moveHintKeys } from '@/ui/TutorialHints';
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

    // Controls are shown as keycaps, listing every binding that works — the
    // same treatment Level 01's in-play hints use, so the two teach the same
    // thing the same way (`ui/KeyCap.ts`).
    const keysX = panelX + panelW - 62;
    let y = panelY + 42;

    for (const row of [
      { caption: t('htpMove'), keys: moveHintKeys() },
      { caption: t('htpJump'), keys: jumpHintKeys() },
    ]) {
      new PixelLabel(this, panelX + 16, y, row.caption, {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      }).setOrigin(0, 0.5);
      buildKeyRow(this, keysX, y, row.keys);
      y += 22;
    }

    const divider = this.add.graphics();
    divider.fillStyle(PALETTE.cyanDim, 0.5);
    divider.fillRect(panelX + 16, y - 4, panelW - 32, 1);
    y += 6;

    for (const line of [
      t('htpHazardLine1'),
      t('htpHazardLine2'),
      t('htpSystemLine1'),
      t('htpSystemLine2'),
      t('htpRetry'),
    ]) {
      new PixelLabel(this, panelX + 16, y, line, {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      }).setOrigin(0, 0.5);
      y += 14;
    }

    new PixelButton(this, width / 2, panelY + panelH - 22, t('back'), {
      width: panelW - 24,
      height: 20,
      textScale: 1,
      onClick: () => this.scene.stop(),
    });
  }
}
