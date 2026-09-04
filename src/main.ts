import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { PHYSICS } from '@/config/physics';
import { MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';
import { blockBrowserGestures } from '@/utils/input/blockBrowserGestures';
import { AudioEngine } from '@/audio/AudioEngine';
import { YandexGamesService } from '@/services/YandexGamesService';
import { SaveService } from '@/services/SaveService';
import { PurchaseManager } from '@/services/PurchaseManager';
import { ScaleController } from '@/core/ScaleController';
import { OrientationGate } from '@/ui/OrientationGate';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameplayScene } from '@/scenes/GameplayScene';
import { PauseScene } from '@/scenes/PauseScene';
import { SettingsScene } from '@/scenes/SettingsScene';
import { HowToPlayScene } from '@/scenes/HowToPlayScene';
import { SectorCompleteScene } from '@/scenes/SectorCompleteScene';
import { LevelSelectScene } from '@/scenes/LevelSelectScene';
import { ShopScene } from '@/scenes/ShopScene';
import '@/shop/EconomyRewards';

const root = document.getElementById('app');
if (!root) throw new Error('#app root element not found');

blockBrowserGestures(root);

// Reflects whatever entitlement this save already owns into AdsService
// before anything in the boot sequence could possibly ask for an ad — pure
// local-save read, no network wait needed for this part.
PurchaseManager.init();

// Started as early as possible — the SDK script is a network fetch, slower
// than generating textures in BootScene, so this races the boot sequence
// rather than blocking it (CLAUDE.md #8 — the game works fully without it).
// Cloud save sync and purchase restoration only make sense once we know
// whether the SDK/an authorized player is actually there, hence chained
// after `init()` instead of also firing immediately — `SaveService`'s own
// localStorage-backed API already works synchronously before any of this
// ever resolves. Cloud sync runs first so restorePurchases() replays
// against the already-merged save, not a stale local-only one.
void YandexGamesService.init()
  .then(() => SaveService.syncWithCloud())
  .then(() => PurchaseManager.restorePurchases());

// Audio focus (master-prompt §32): a hidden tab suspends the context outright
// instead of letting scheduled nodes play into nothing, and picks back up on
// return — the game itself already pauses independently via `OrientationGate`.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) AudioEngine.suspend();
  else AudioEngine.resume();
});

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
  // Default is a single touch pointer — the floating move joystick and the
  // jump zone need to be held down by two fingers at once (TouchControls.ts).
  input: {
    activePointers: 2,
  },
  // All sound is our own procedural synth (`audio/`), never Phaser's sample
  // player — without this, Phaser's own `WebAudioSoundManager` still opens a
  // second, entirely unused `AudioContext` at boot.
  audio: {
    noAudio: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravity },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    GameplayScene,
    PauseScene,
    SettingsScene,
    HowToPlayScene,
    SectorCompleteScene,
    LevelSelectScene,
    ShopScene,
  ],
});

new ScaleController(game);

new OrientationGate((blocked) => {
  if (blocked) game.pause();
  else game.resume();
});

// Dev-only hooks for local/CI verification scripts. Never ships:
// import.meta.env.DEV is statically false in a production build, so
// bundlers dead-code-eliminate this whole block — including the dynamic
// import below, which is the only place `ShopDevTools` (and everything it
// pulls in) is ever referenced (verified as part of the bundle-size audit —
// CLAUDE.md #Phase 0).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
  void import('@/dev/ShopDevTools').then(({ ShopDevTools }) => {
    (window as unknown as { __shopDev: typeof ShopDevTools }).__shopDev = ShopDevTools;
  });
}
