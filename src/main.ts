import Phaser from 'phaser';
import { GameState } from '@/core/GameState';
import '@/ui/fonts';
import { PALETTE } from '@/config/palette';
import { PHYSICS } from '@/config/physics';
import { MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';
import { blockBrowserGestures } from '@/utils/input/blockBrowserGestures';
import { requestFullscreenOnFirstGesture } from '@/utils/input/fullscreen';
import { inputState } from '@/utils/input/InputState';
import { LocaleState } from '@/i18n/Locale';
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
import { DailyResultScene } from '@/scenes/DailyResultScene';
import { LevelSelectScene } from '@/scenes/LevelSelectScene';
import { ShopScene } from '@/scenes/ShopScene';
import '@/shop/EconomyRewards';
import '@/services/LeaderboardSubmission';

const root = document.getElementById('app');
if (!root) throw new Error('#app root element not found');

blockBrowserGestures(root);
requestFullscreenOnFirstGesture(root);

// Reflects whatever entitlement this save already owns into AdsService
// before anything in the boot sequence could possibly ask for an ad — pure
// local-save read, no network wait needed for this part.
PurchaseManager.init();

// Started as early as possible — the SDK script is a network fetch, slower
// than generating textures in BootScene, so this races the boot sequence
// rather than blocking it (CLAUDE.md #8 — the game works fully without it).
//
// Cloud save sync and purchase restoration only make sense with a real SDK,
// so they hang off `onReady` rather than off `init()`: `init()` now settles
// on a timeout too (`SDK_INIT_TIMEOUT_MS`), and a chain hung off it would
// run once against no SDK on a slow connection and never run again when the
// SDK finally landed. `SaveService`'s own localStorage-backed API already
// works synchronously long before any of this resolves. Cloud sync runs
// first so restorePurchases() replays against the already-merged save, not
// a stale local-only one.
void YandexGamesService.init();
YandexGamesService.onReady(() => {
  void SaveService.syncWithCloud().then(() => PurchaseManager.restorePurchases());
  applyDetectedLanguage();
});

/**
 * Yandex Games requirement 2.14 — the game detects the player's language
 * through the SDK. `LocaleState` decides whether to take it: a language the
 * player chose by hand in settings always wins, and anything outside `ru`/`en`
 * leaves the default alone (see `i18n/Locale.ts`).
 *
 * This lands late by nature — the SDK is a network fetch and boot is not — so
 * the menu may already be on screen in the wrong language by the time the
 * answer arrives. Whatever is showing is therefore rebuilt, but only from the
 * menu: no attempt is ever interrupted for this, and once the player is past
 * the menu the next scene picks the language up on its own.
 */
function applyDetectedLanguage(): void {
  if (!LocaleState.applyDetected(YandexGamesService.getDetectedLanguage())) return;
  if (game.scene.isActive('MainMenuScene')) game.scene.getScene('MainMenuScene').scene.restart();
}

// Audio focus (master-prompt §32): a hidden tab suspends the context outright
// instead of letting scheduled nodes play into nothing, and picks back up on
// return — the game itself already pauses independently via `OrientationGate`.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) AudioEngine.suspend();
  else AudioEngine.resume();
});

// The other half of that, and the one `visibilitychange` cannot see: a
// Yandex ad is drawn over this same document, so the page never goes hidden
// while it plays. Requirement 4.7 asks for both the sound and the game itself
// to stop for its duration (the SDK side of the pause — `GameplayAPI` — is
// handled inside the facade, which is the only thing that knows whether an
// attempt was running). Held keys go too: the ad takes the focus, so no
// `keyup` would ever arrive for them.
YandexGamesService.onAdBreak((open) => {
  if (open) {
    inputState.releaseAll();
    AudioEngine.suspend();
    game.pause();
  } else {
    game.resume();
    AudioEngine.resume();
  }
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
    DailyResultScene,
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
  // The session counters, for the same verification scripts — the attempt
  // and sector totals are only otherwise visible as rendered HUD glyphs.
  (window as unknown as { __gameState: typeof GameState }).__gameState = GameState;
  void import('@/dev/ShopDevTools').then(({ ShopDevTools }) => {
    (window as unknown as { __shopDev: typeof ShopDevTools }).__shopDev = ShopDevTools;
  });
}
