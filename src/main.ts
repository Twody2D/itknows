import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { PHYSICS } from '@/config/physics';
import { MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';
import { blockBrowserGestures } from '@/utils/input/blockBrowserGestures';
import { ScaleController } from '@/core/ScaleController';
import { OrientationGate } from '@/ui/OrientationGate';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameplayScene } from '@/scenes/GameplayScene';
import { PauseScene } from '@/scenes/PauseScene';
import { SettingsScene } from '@/scenes/SettingsScene';
import { HowToPlayScene } from '@/scenes/HowToPlayScene';

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
  scene: [BootScene, MainMenuScene, GameplayScene, PauseScene, SettingsScene, HowToPlayScene],
});

new ScaleController(game);

new OrientationGate((blocked) => {
  if (blocked) game.pause();
  else game.resume();
});

// Dev-only hook for local/CI verification scripts to jump straight to a
// scene (e.g. a specific level) without scripting menu navigation and level
// transition timing. Never ships: import.meta.env.DEV is statically false
// in a production build, so bundlers dead-code-eliminate this block
// (verified as part of the bundle-size audit — CLAUDE.md #Phase 0).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
