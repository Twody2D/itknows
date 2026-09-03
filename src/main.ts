import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { PHYSICS } from '@/config/physics';
import { MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';
import { blockBrowserGestures } from '@/utils/input/blockBrowserGestures';
import { ScaleController } from '@/core/ScaleController';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameplayScene } from '@/scenes/GameplayScene';

const root = document.getElementById('app');
if (!root) throw new Error('#app root element not found');

blockBrowserGestures(root);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: root,
  backgroundColor: PALETTE.bgVoid,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.NONE,
    width: MIN_VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravity },
      debug: false,
    },
  },
  scene: [BootScene, MainMenuScene, GameplayScene],
});

new ScaleController(game);
