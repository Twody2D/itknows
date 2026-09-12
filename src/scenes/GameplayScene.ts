import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import type { InputState } from '@/utils/input/InputState';
import { inputState as sharedInputState } from '@/utils/input/InputState';
import { TouchControls } from '@/ui/components/TouchControls';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { isTouchDevice } from '@/utils/input/isTouchDevice';
import { buildEnvironmentLayers } from '@/art/Environment';
import { FxManager } from '@/fx/FxManager';
import { Player } from '@/gameplay/Player';
import { GhostRecorder } from '@/gameplay/GhostRecorder';
import { GhostSprite } from '@/gameplay/GhostSprite';
import { GhostSettings } from '@/gameplay/GhostSettings';
import { GhostService } from '@/services/GhostService';
import { TrailFx } from '@/gameplay/TrailFx';
import type { TrailKind } from '@/gameplay/TrailFx';
import { buildLevel } from '@/gameplay/Level';
import type { BuiltLevel, CheckpointZone } from '@/gameplay/Level';
import type { LevelDef } from '@/gameplay/LevelDef';
import { getLevel, getNextLevelId } from '@/gameplay/LevelFactory';
import { GameState } from '@/core/GameState';
import { SaveService } from '@/services/SaveService';
import { YandexGamesService } from '@/services/YandexGamesService';
import { InventoryService } from '@/services/InventoryService';
import { playSfx } from '@/audio/SfxManager';
import { MusicSequencer } from '@/audio/MusicSequencer';
import { EventBus } from '@/core/EventBus';
import type { DeathCause } from '@/core/EventBus';
import { BehaviorTracker } from '@/ai/BehaviorTracker';
import { PlayerProfile } from '@/ai/PlayerProfile';
import { SystemMemory } from '@/ai/SystemMemory';
import { selectVariant } from '@/ai/DifficultyDirector';
import { Commentator } from '@/ai/Commentator';
import { SystemVoice } from '@/ai/SystemVoice';
import { personalityTag } from '@/ai/SystemPersonality';
import { isSectorFinale, sectorNumberOf } from '@/gameplay/sectors';
import type { SectorCompleteData } from '@/scenes/SectorCompleteScene';
import { TutorialHints } from '@/ui/TutorialHints';
import { fadeIn } from '@/ui/SceneFade';
import { MIN_VIRTUAL_WIDTH, TILE_SIZE } from '@/config/display';
import { formatMmSs } from '@/utils/formatTime';
import { t } from '@/i18n/ui';

const SYSTEM_COMMENT_DISPLAY_MS = 3800;
/**
 * Upper bound on the world zoom — past this the visible level gets narrower
 * than levels are authored for (`MIN_VIRTUAL_WIDTH`). VISUAL RESET v1 #15:
 * tighter framing everywhere (not just touch) keeps the character a large
 * fraction of the frame; 1.28 is the highest value that still leaves at
 * least `MIN_VIRTUAL_WIDTH` visible even at `MAX_VIRTUAL_WIDTH`'s widest
 * screen (620 / 1.28 ≈ 484 > 480), so no level ever shows less than it was
 * designed against.
 */
const MAX_WORLD_ZOOM = 1.28;

interface GameplaySceneData {
  levelId: string;
  /** Checkpoint tile column to respawn at instead of the level's own spawn — set by a mid-attempt death after crossing one. */
  respawnCol?: number;
  /** Fade in from black on entry — only for deliberate navigation (main menu → gameplay, sector complete → next sector), never death-retry or a same-level restart (`ui/SceneFade.ts`). */
  entryTransition?: boolean;
  /** Skips `DifficultyDirector`'s adaptive pick entirely — Daily Challenge's only door in, since every player must land on the exact same variant for the same date for the seed (and any future shared leaderboard) to mean anything (CLAUDE.md #6). */
  forceVariantId?: string;
}

/** Pixels of leeway when deciding whether the player was already above a one-way platform. */
const ONE_WAY_TOLERANCE = 4;

const TRAIL_KINDS: readonly TrailKind[] = ['data_trail', 'launch', 'interference', 'beep7'];

/** The equipped trail slot is always some valid id by construction (`InventoryService.equip` only accepts an already-owned id, and every fresh save starts on `data_trail`) — the guard exists only so a corrupted/legacy save value can't reach `TrailFx` untyped. */
function equippedTrailKind(): TrailKind {
  const id = InventoryService.getEquipped('trail');
  return (TRAIL_KINDS as readonly string[]).includes(id) ? (id as TrailKind) : 'data_trail';
}

/**
 * Owns one attempt at one level: spawns the player, builds geometry and
 * traps, wires collisions, and resolves death/victory. Feeds THE SYSTEM
 * (`BehaviorTracker` → `PlayerProfile`/`SystemMemory` → `DifficultyDirector`/
 * `Commentator`, Phase 3) at exactly two points: `init()` picks a variant
 * before the level is built, and death/clear hand off the attempt's
 * telemetry once it's over — never anything mid-attempt (CLAUDE.md #4.1).
 * Retry auto-restarts fast; an explicit TRY AGAIN button and a polished
 * terminal UI for SYSTEM commentary are Phase 4 — until then this keeps the
 * death → retry loop honest and near-instant on its own.
 */
export class GameplayScene extends Phaser.Scene {
  private levelDef!: LevelDef;
  private level!: BuiltLevel;
  private player!: Player;
  private inputState!: InputState;
  private touchControls?: TouchControls;
  private behaviorTracker!: BehaviorTracker;
  private variantId!: string;
  /**
   * Sentinel until the first `update()` tick: a scene's own `this.time.now`
   * reads 0 during `create()` — its per-scene clock hasn't stepped yet, even
   * on a scene reused via `restart()`/`start()` after the game has been
   * running a while — so capturing it here instead of in `create()` is the
   * only way this (and `attemptElapsedMs` in `handlePlayerDeath`) reads
   * correctly on a session's very first level. Found live while verifying
   * the ghost recorder: its first sample landed at `t ≈ this.time.now` for
   * that one case instead of near 0.
   */
  private attemptStartMs = -1;
  private hesitationCommented = false;
  private readonly ghostRecorder = new GhostRecorder();
  private ghostSprite: GhostSprite | null = null;
  private trailFx: TrailFx | null = null;

  private hudTimeText!: PixelLabel;
  private hudAttemptsText!: PixelLabel;
  private hudSystemText!: PixelLabel;
  private hudSystemPill!: Phaser.GameObjects.Graphics;
  /** Last whole second shown on the HUD clock — `PixelLabel.setPixelText` rebuilds a canvas texture per call, so the live timer is throttled to once a second (CLAUDE.md #9) instead of following `attemptElapsedMs`'s tenths every frame. */
  private hudLastShownSeconds = -1;
  private hudProgressTrackX = 0;
  private hudProgressTrackW = 0;
  private hudProgressFill!: Phaser.GameObjects.Rectangle;
  private hudProgressMarker!: Phaser.GameObjects.Rectangle;
  /** Best-effort "which trap probably did this" — `Player.kill()` only carries a cause, not a trap id (see BehaviorTracker's doc comment for the same limitation). */
  private lastTriggeredTrapId: string | null = null;

  private fx!: FxManager;
  /** id → hazard game object, built once per level so warning-pulse can find the right visual from `trap:armed`'s id-only payload. */
  private hazardById = new Map<string, Phaser.GameObjects.GameObject & { alpha: number }>();

  private resolving = false;
  private tutorialHints?: TutorialHints;
  private activeRespawnCol: number | undefined;
  private uiCamera?: Phaser.Cameras.Scene2D.Camera;
  private buildingUi = false;
  private useEntryFade = false;

  constructor() {
    super('GameplayScene');
  }

  init(data: GameplaySceneData): void {
    // THE SYSTEM only ever picks a variant here, before the level is built —
    // never mid-attempt (CLAUDE.md #4.1, see DifficultyDirector's doc comment).
    this.variantId = data.forceVariantId ?? selectVariant(data.levelId, PlayerProfile.snapshot(), SystemMemory.snapshot());
    this.levelDef = getLevel(data.levelId, this.variantId);
    SaveService.setLastLevelId(this.levelDef.id);
    this.resolving = false;
    this.hesitationCommented = false;
    this.activeRespawnCol = data.respawnCol;
    this.useEntryFade = data.entryTransition ?? false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    // Added before either camera exists, so it renders on both without extra
    // routing (`ui/SceneFade.ts`). Never set for a death-retry or a same-
    // level restart — see `GameplaySceneData.entryTransition`'s doc comment.
    if (this.useEntryFade) fadeIn(this);

    if (GameState.currentLevelId !== this.levelDef.id) {
      GameState.currentLevelId = this.levelDef.id;
      GameState.startRun();
    }
    if (this.levelDef.id.endsWith('-level-01')) GameState.startSector();
    GameState.currentVariantId = this.variantId;

    this.level = buildLevel(this, this.levelDef);
    // Ground the skyline on the visible floor line, not the world's full
    // fall-pit height (`worldHeight` includes space below the floor) —
    // the same class of bug the menu's environment call already fixed.
    buildEnvironmentLayers(this, this.level.worldWidth, this.level.spawn.y, this.levelDef.id);
    this.setupInput();
    this.behaviorTracker = new BehaviorTracker();
    // Real capture happens on the first `update()` tick — see the field's
    // doc comment for why `this.time.now` can't be trusted here.
    this.attemptStartMs = -1;
    this.ghostRecorder.reset();
    EventBus.emit('level:loaded', { levelId: this.levelDef.id, variantId: this.variantId });
    MusicSequencer.start();
    YandexGamesService.notifyGameplayStart();
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);

    const spawnX =
      this.activeRespawnCol !== undefined ? this.activeRespawnCol * TILE_SIZE + TILE_SIZE / 2 : this.level.spawn.x;

    // Ghost and trail are pure visual overlays — created before the player
    // so draw order never lets either cover the real character (master-
    // prompt §40 for the ghost; the trail is shop cosmetic content).
    const ghostRecord = GhostSettings.enabled ? GhostService.getGhost(this.levelDef.id, this.variantId) : null;
    this.ghostSprite = ghostRecord ? new GhostSprite(this, ghostRecord.samples) : null;

    this.trailFx = new TrailFx(this, equippedTrailKind(), spawnX, this.level.spawn.y);

    this.player = new Player(this, spawnX, this.level.spawn.y, this.inputState);

    this.physics.world.setBounds(0, -400, this.level.worldWidth, this.level.worldHeight + 800);
    this.physics.add.collider(this.player, this.level.groundGroup);
    this.physics.add.collider(this.player, this.level.platformsGroup, undefined, (playerObj, platformObj) =>
      this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.player, this.level.spikesGroup, () => {
      this.player.kill('spike');
    });
    this.physics.add.overlap(this.player, this.level.exitZone, () => {
      this.onExitReached();
    });

    for (const checkpoint of this.level.checkpoints) {
      this.physics.add.overlap(this.player, checkpoint.zone, () => this.activateCheckpoint(checkpoint));
    }

    this.setupTraps();

    this.fx = new FxManager(this);
    this.hazardById.clear();
    for (const hazard of this.level.traps.lethalHazards) {
      this.hazardById.set(hazard.id, hazard.visual ?? (hazard.gameObject as Phaser.GameObjects.GameObject & { alpha: number }));
    }

    this.setupCameras();
    this.buildHud();

    if (this.levelDef.id === 'sector-01-level-01') {
      const firstGapCol = this.levelDef.gaps[0]?.[0] ?? this.levelDef.exitCol;
      const jumpTriggerX = (firstGapCol - 5) * TILE_SIZE;
      this.tutorialHints = new TutorialHints(this, this.player, this.inputState, jumpTriggerX);
    }

    EventBus.on('player:died', this.handlePlayerDeath, this);
    EventBus.on('system:comment', this.handleSystemComment, this);
    EventBus.on('trap:triggered', this.handleTrapTriggered, this);
    EventBus.on('trap:armed', this.handleTrapArmed, this);
    EventBus.on('player:jumped', this.handlePlayerJumped, this);
    EventBus.on('player:landed', this.handlePlayerLanded, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('player:died', this.handlePlayerDeath, this);
      EventBus.off('system:comment', this.handleSystemComment, this);
      EventBus.off('trap:triggered', this.handleTrapTriggered, this);
      EventBus.off('trap:armed', this.handleTrapArmed, this);
      EventBus.off('player:jumped', this.handlePlayerJumped, this);
      EventBus.off('player:landed', this.handlePlayerLanded, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
      MusicSequencer.stop();
      YandexGamesService.notifyGameplayStop();
      this.touchControls?.destroy();
      this.behaviorTracker.destroy();
      this.ghostSprite?.destroy();
      this.trailFx?.destroy();
      this.fx.destroy();
      this.tutorialHints?.destroy();
      for (const trap of this.level.traps.all) trap.destroy();
    });
  }

  /**
   * Two cameras: the world camera, which may be zoomed in, and a UI camera at
   * 1:1 that draws the HUD, the pause button, touch controls and SYSTEM
   * commentary.
   *
   * On a phone the virtual viewport is at its widest (a 20:9 screen fills
   * ~586 virtual px across), which made the character and the level read as
   * tiny — you were looking at more level than you needed to. Zooming the
   * world camera shows less of it, at a larger size, and is capped so that no
   * less than MIN_VIRTUAL_WIDTH of level stays visible (CLAUDE.md #2 — nothing
   * gameplay-critical may need more horizontal space than that). Zooming the
   * single camera the scene used to have would have scaled the HUD and the
   * thumb buttons with it, which is the opposite of what's wanted.
   */
  private setupCameras(): void {
    const main = this.cameras.main;
    const zoom = Phaser.Math.Clamp(this.scale.width / MIN_VIRTUAL_WIDTH, 1, MAX_WORLD_ZOOM);

    main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    main.setZoom(zoom);
    // Plain lerp-follow, no deadzone: a deadzone rectangle here would have to
    // be sized precisely against `scale.width/zoom` to behave, and it did
    // not — the camera would sit frozen for well over half the screen's
    // width of player movement, then catch up all at once, reading exactly
    // like "the world jerks and slides back". Lerp alone tracks continuously
    // and smoothly with no such catch-up snap.
    main.startFollow(this.player, true, 0.12, 0.12);
    main.setRoundPixels(true);

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setRoundPixels(true);
    // Everything built so far is world content.
    this.uiCamera.ignore(this.children.list);
    // From here on, route by which pass created the object — UI is built
    // inside `withUiCamera`, everything else (FX particles, trap visuals,
    // tutorial hints) is world content created at arbitrary later times.
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.routeObjectToCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.routeObjectToCamera, this);
    });
  }

  private routeObjectToCamera(obj: Phaser.GameObjects.GameObject): void {
    if (this.buildingUi) this.cameras.main.ignore(obj);
    else this.uiCamera?.ignore(obj);
  }

  /** Runs `build` with new objects routed to the UI camera instead of the world camera. */
  private withUiCamera(build: () => void): void {
    this.buildingUi = true;
    try {
      build();
    } finally {
      this.buildingUi = false;
    }
  }

  /**
   * Floating platforms are one-way: solid when landed on from above, passable
   * when approached from below or the side. Standard Arcade recipe — compare
   * the player's bottom edge before this step's vertical movement against the
   * platform's top edge (CLAUDE.md #Phase 1 — one-way platforms).
   */
  private isLandingOnPlatform(player: Player, platform: Phaser.Physics.Arcade.Sprite): boolean {
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | Phaser.Physics.Arcade.Body;
    const previousBottom = player.body.bottom - player.body.deltaY();
    return previousBottom <= platformBody.top + ONE_WAY_TOLERANCE;
  }

  private setupTraps(): void {
    const traps = this.level.traps;

    for (const hazard of traps.lethalHazards) {
      this.physics.add.overlap(this.player, hazard.gameObject, () => {
        if (hazard.isLethal()) this.player.kill('trap');
      });
    }

    for (const platform of traps.disappearingPlatforms) {
      this.physics.add.collider(
        this.player,
        platform.gameObject,
        () => platform.notifyStandingOn(),
        (playerObj, platformObj) =>
          platform.isSolid() && this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
      );
    }

    for (const platform of traps.fallingPlatforms) {
      this.physics.add.collider(
        this.player,
        platform.gameObject,
        () => platform.notifyStandingOn(),
        (playerObj, platformObj) =>
          platform.isSolid() && this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
      );
    }

    for (const platform of traps.movingPlatforms) {
      this.physics.add.collider(this.player, platform.gameObject, undefined, (playerObj, platformObj) =>
        this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
      );
    }

    for (const gate of traps.timingGates) {
      this.physics.add.collider(this.player, gate.gameObject, undefined, () => !gate.isOpen());
    }

    for (const trigger of traps.triggers) {
      this.physics.add.overlap(this.player, trigger.gameObject, () => trigger.fire());
    }

    for (const fakeExit of traps.fakeExits) {
      this.physics.add.overlap(this.player, fakeExit.zone, () => fakeExit.reject());
    }
  }

  private setupInput(): void {
    this.input.keyboard?.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.inputState = sharedInputState;
    // Touch controls are HUD, so they're built with the rest of it, after the
    // UI camera exists (`buildHud`).
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
  }

  /**
   * Menu/pause and settings are never on the retry-loop's hot path — freely
   * pausable, no honesty-invariant concerns (CLAUDE.md #4 is about level
   * geometry/timing during an attempt, not the player choosing to step
   * away). Also pausable mid-death-animation/mid-victory: `scene.pause()`
   * freezes this scene's own timers too, so the pending `delayedCall` for
   * the death restart or the victory scene transition simply resumes
   * exactly where it left off once the player unpauses — never fires twice.
   */
  private pauseGame(): void {
    YandexGamesService.notifyGameplayStop();
    // The attempt/sector clocks are wall clocks, so pausing the scene does
    // not stop them — `PauseScene` restarts them from its own shutdown,
    // whichever of its three exits the player takes.
    GameState.pauseClock();
    this.scene.pause();
    this.scene.launch('PauseScene', { gameplaySceneKey: this.scene.key, levelId: this.levelDef.id });
  }

  /** Mirrors `pauseGame`'s stop — fired by `PauseScene`'s "Продолжить" resuming this scene directly (CLAUDE.md #8: pause never counts as gameplay, so the pair must be exact). */
  private handleResume(): void {
    YandexGamesService.notifyGameplayStart();
  }

  /** master-prompt §70 — the version tag climbs with campaign progress, see SystemPersonality.ts. */
  private systemLabel(): string {
    return `SYSTEM ${personalityTag(this.levelDef.id)}`;
  }

  override update(time: number, delta: number): void {
    if (this.attemptStartMs < 0) this.attemptStartMs = time;

    if (this.player.isAlive() && this.player.y > this.level.worldHeight + 40) {
      this.player.kill('fall');
    }

    for (const trap of this.level.traps.updatable) trap.update(time, delta);
    for (const pursuer of this.level.traps.pursuers) pursuer.update(this.player.x);
    this.carryOnMovingPlatforms();
    this.tutorialHints?.update();

    const attemptElapsedMs = time - this.attemptStartMs;
    this.behaviorTracker.sample(time, delta, this.inputState, this.player.isAlive());
    if (this.player.isAlive()) {
      this.ghostRecorder.sample(attemptElapsedMs, this.player.x, this.player.y, this.player.flipX);
    }
    this.ghostSprite?.update(attemptElapsedMs);
    this.trailFx?.update(
      attemptElapsedMs,
      delta,
      { x: this.player.x, y: this.player.y, vx: this.player.body.velocity.x, vy: this.player.body.velocity.y, flipX: this.player.flipX },
      this.player.isAlive(),
    );
    if (!this.hesitationCommented) {
      const line = Commentator.commentOnHesitation(this.behaviorTracker.hesitationSoFarMs);
      if (line) this.hesitationCommented = true;
    }

    const voiceText = SystemVoice.current();
    const rendered = voiceText ? `${this.systemLabel()}: ${voiceText}` : '';
    if (this.hudSystemText.pixelText !== rendered) {
      this.hudSystemText.setPixelText(rendered);
      this.refreshSystemPill();
    }

    const shownSeconds = Math.floor(attemptElapsedMs / 1000);
    if (shownSeconds !== this.hudLastShownSeconds) {
      this.hudLastShownSeconds = shownSeconds;
      this.hudTimeText.setPixelText(formatMmSs(attemptElapsedMs));
    }
    if (this.player.isAlive()) this.updateProgressBar();
  }

  /** Nudges the player by a moving platform's per-frame delta while standing on it. */
  private carryOnMovingPlatforms(): void {
    for (const platform of this.level.traps.movingPlatforms) {
      const { dx, dy } = platform.consumeDelta();
      if (dx === 0 && dy === 0) continue;

      const body = platform.gameObject.body as Phaser.Physics.Arcade.Body;
      const isRiding =
        Math.abs(this.player.body.bottom - body.top) <= ONE_WAY_TOLERANCE + 2 &&
        this.player.body.right > body.left &&
        this.player.body.left < body.right;

      if (isRiding) {
        this.player.x += dx;
        this.player.y += dy;
      }
    }
  }

  private buildHud(): void {
    this.withUiCamera(() => this.buildHudObjects());
  }

  /**
   * Design round 4h: one compact strip (time + attempt count) instead of the
   * old 168×56 panel with a red "DEATHS N" — a dying counter in the game's
   * one danger color read as "you already lost" rather than "the process is
   * working" (master-prompt's own framing of death, CLAUDE.md #4/§this
   * scene's own class doc). The level/sector name drops to a small caption
   * under the strip instead of leading it — it's orientation, not the thing
   * a player needs to read every second.
   *
   * The in-level "chips" counter from the same design pass is deliberately
   * not built: it assumes a collectible-pickup mechanic that doesn't exist
   * anywhere in this game yet (CLAUDE.md #12 — no placeholder content).
   */
  private buildHudObjects(): void {
    const stripX = 8;
    const stripY = 8;
    const stripH = 22;
    const stripW = 104;

    const strip = this.add.graphics().setScrollFactor(0).setDepth(899);
    strip.fillStyle(PALETTE.bgVoid, 0.75);
    strip.fillRect(stripX, stripY, stripW, stripH);
    strip.lineStyle(1, PALETTE.cyanDim, 1);
    strip.strokeRect(stripX + 0.5, stripY + 0.5, stripW - 1, stripH - 1);

    this.hudTimeText = new PixelLabel(this, stripX + 8, stripY + stripH / 2, formatMmSs(0), {
      color: hexToCss(PALETTE.cyan),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(900);

    strip.lineStyle(1, PALETTE.cyanDim, 1);
    strip.lineBetween(stripX + 52, stripY + 4, stripX + 52, stripY + stripH - 4);

    const attemptIcon = this.add.graphics().setScrollFactor(0).setDepth(900);
    attemptIcon.lineStyle(1.5, PALETTE.dangerAlt, 1);
    attemptIcon.strokeRect(stripX + 60, stripY + stripH / 2 - 4, 8, 8);

    this.hudAttemptsText = new PixelLabel(this, stripX + 74, stripY + stripH / 2, String(GameState.run.deaths), {
      color: hexToCss(PALETTE.dangerAlt),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(900);

    const sectorLabel = `${t('resultSectorLabel').toUpperCase()} ${String(sectorNumberOf(this.levelDef.id)).padStart(2, '0')} · ${this.levelDef.name.toUpperCase()}`;
    new PixelLabel(this, stripX, stripY + stripH + 4, sectorLabel, {
      color: hexToCss(PALETTE.labelMuted),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    })
      .setScrollFactor(0)
      .setDepth(900);

    // SYSTEM presence — a small always-on pulsing dot, distinct from the
    // transient commentary pill below (§13: SYSTEM should feel like a
    // character that's always watching, not just a text log).
    const systemDot = this.add.circle(stripX + stripW + 14, stripY + stripH / 2, 4, PALETTE.system, 1).setScrollFactor(0).setDepth(900);
    this.tweens.add({
      targets: systemDot,
      alpha: { from: 0.5, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Level-progress bar (real data: player x / this.level.worldWidth,
    // same fraction `Commentator.commentOnDeath` already uses) — centered so
    // it stays clear of both the strip and the pause button across the
    // 480-620 floating-width range (master-prompt §2).
    this.hudProgressTrackW = Math.min(240, this.scale.width - 160);
    this.hudProgressTrackX = this.scale.width / 2 - this.hudProgressTrackW / 2;
    const trackY = 15;

    this.add
      .rectangle(this.hudProgressTrackX, trackY, this.hudProgressTrackW, 6, PALETTE.metalEdge, 0.7)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(899);
    this.hudProgressFill = this.add
      .rectangle(this.hudProgressTrackX, trackY, 0, 6, PALETTE.cyan, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(900);
    this.hudProgressMarker = this.add
      .rectangle(this.hudProgressTrackX, trackY, 3, 12, PALETTE.white, 1)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(901);
    this.add
      .rectangle(this.hudProgressTrackX + this.hudProgressTrackW, trackY, 6, 10, PALETTE.reward, 1)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(900);
    this.updateProgressBar();

    this.hudSystemPill = this.add.graphics().setScrollFactor(0).setDepth(899).setVisible(false);

    const initialVoiceText = SystemVoice.current();
    this.hudSystemText = new PixelLabel(
      this,
      16,
      this.scale.height - 12,
      initialVoiceText ? `${this.systemLabel()}: ${initialVoiceText}` : '',
      {
        color: hexToCss(PALETTE.systemLight),
        strokeColor: hexToCss(PALETTE.outline),
        // Deliberately smaller than the strip above — a full SYSTEM sentence
        // at a bigger scale could wrap to 2-3 lines and dominate the whole
        // bottom of the screen right after a death. Scale 1 plus the longer
        // display window above reads as a caption, not a billboard.
        scale: 1,
        wordWrapWidth: this.scale.width - 32,
      },
    )
      // Bottom-anchored (not top-left) so a 2-line SYSTEM line grows upward
      // off the screen edge instead of overflowing past the bottom of it —
      // the old top-left anchor at a fixed offset only worked for one line.
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(900);
    this.refreshSystemPill();

    new PixelButton(this, this.scale.width - 24, 24, 'II', {
      width: 36,
      height: 36,
      textScale: 3,
      onClick: () => this.pauseGame(),
    })
      .setScrollFactor(0)
      .setDepth(900);

    this.touchControls = new TouchControls(this, this.inputState);
    this.touchControls.setVisible(isTouchDevice());
  }

  /** Redraws the SYSTEM-line pill to fit whatever `hudSystemText` currently renders — called only when the text itself changes, never per-frame (same rebuild-cost reasoning as `hudLastShownSeconds`). */
  private refreshSystemPill(): void {
    this.hudSystemPill.clear();
    if (this.hudSystemText.pixelText === '') {
      this.hudSystemPill.setVisible(false);
      return;
    }

    const padX = 8;
    const padY = 5;
    const w = this.hudSystemText.width + padX * 2;
    const h = this.hudSystemText.height + padY * 2;
    const x = this.hudSystemText.x - padX;
    const y = this.hudSystemText.y - h + padY;

    this.hudSystemPill.fillStyle(PALETTE.systemDim, 0.55);
    this.hudSystemPill.fillRect(x, y, w, h);
    this.hudSystemPill.fillStyle(PALETTE.system, 1);
    this.hudSystemPill.fillRect(x, y, 2, h);
    this.hudSystemPill.setVisible(true);
  }

  /** Fill width + "you are here" marker from real player position — `Graphics`/`Rectangle` resizing is a property mutation, not a texture rebuild, so (unlike `PixelLabel`) this is cheap enough to run every frame. */
  private updateProgressBar(): void {
    const fraction = Phaser.Math.Clamp(this.player.x / this.level.worldWidth, 0, 1);
    const fillW = this.hudProgressTrackW * fraction;
    this.hudProgressFill.width = fillW;
    this.hudProgressMarker.x = this.hudProgressTrackX + fillW;
  }

  /**
   * Renders whatever THE SYSTEM says, decoupled from who said it
   * (Commentator emits `system:comment`; this scene just displays it). A
   * dedicated terminal UI is Phase 4 — this is the minimum needed for the
   * commentary to actually be visible now instead of firing silently.
   */
  private handleSystemComment(payload: { text: string; category: string }): void {
    SystemVoice.show(payload.text, payload.category, SYSTEM_COMMENT_DISPLAY_MS);
  }

  private handleTrapTriggered(payload: { trapId: string }): void {
    this.lastTriggeredTrapId = payload.trapId;
    this.fx.stopWarningPulse(payload.trapId, this.hazardById.get(payload.trapId));
    playSfx('trapTrigger');
  }

  /** Fast alpha pulse on the hazard while it's telegraphing — makes the honest warning (CLAUDE.md #4.2) harder to miss, not just a color swap. */
  private handleTrapArmed(payload: { trapId: string }): void {
    const target = this.hazardById.get(payload.trapId);
    if (target) this.fx.startWarningPulse(payload.trapId, target);
    playSfx('trapWarning');
    MusicSequencer.requestTension();
  }

  private handlePlayerJumped(): void {
    this.fx.jumpDust(this.player.x, this.player.y);
    this.trailFx?.onJump(this.player.x, this.player.y);
    playSfx('jump');
  }

  private handlePlayerLanded(payload: { x: number; y: number }): void {
    this.fx.landDust(payload.x, payload.y);
    playSfx('land');
  }

  private handlePlayerDeath(payload: { cause: DeathCause; x: number; y: number }): void {
    if (this.resolving) return;
    this.resolving = true;
    GameState.registerDeath();
    this.hudAttemptsText.setPixelText(String(GameState.run.deaths));
    this.fx.deathBurst(payload.x, payload.y, InventoryService.getEquipped('death_fx') as 'static' | 'glitch' | 'data_wipe');
    this.trailFx?.onPlayerDeath(this);
    playSfx('death');

    const attemptElapsedMs = this.time.now - this.attemptStartMs;
    const trapId = payload.cause === 'trap' ? this.lastTriggeredTrapId : null;
    SystemMemory.registerDeath(this.levelDef.id, payload.cause, trapId);
    PlayerProfile.integrate(this.behaviorTracker.finish(payload.cause, false));
    Commentator.commentOnDeath({
      cause: payload.cause,
      attemptElapsedMs,
      totalDeaths: GameState.run.deaths,
      repeatDeathCount: SystemMemory.snapshot().repeatDeathCount,
      progressFraction: Phaser.Math.Clamp(payload.x / this.level.worldWidth, 0, 1),
    });

    this.time.delayedCall(450, () => {
      this.scene.restart({ levelId: this.levelDef.id, respawnCol: this.activeRespawnCol });
    });
  }

  /** Crossing a checkpoint moves this attempt's death-respawn point forward — never backward, and it never re-fires for one already passed. */
  private activateCheckpoint(checkpoint: CheckpointZone): void {
    if (this.activeRespawnCol !== undefined && checkpoint.col <= this.activeRespawnCol) return;
    this.activeRespawnCol = checkpoint.col;
    playSfx('checkpoint');

    const marker = checkpoint.zone.getData('marker') as Phaser.GameObjects.Rectangle | undefined;
    marker?.setFillStyle(PALETTE.cyan, 1);

    const label = new PixelLabel(this, checkpoint.zone.x, checkpoint.zone.y - 20, 'CHECKPOINT', {
      color: hexToCss(PALETTE.cyan),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 1);
    this.tweens.add({
      targets: label,
      alpha: { from: 1, to: 0 },
      y: label.y - 6,
      duration: 900,
      delay: 300,
      onComplete: () => label.destroy(),
    });
  }

  private onExitReached(): void {
    if (this.resolving || !this.player.isAlive()) return;
    this.resolving = true;
    this.player.markVictory();
    this.fx.victoryBurst(this.player.x, this.player.y);
    playSfx('levelComplete');
    MusicSequencer.celebrateVictory();

    const timeMs = GameState.elapsedMs();
    const deaths = GameState.run.deaths;
    EventBus.emit('level:completed', { levelId: this.levelDef.id, timeMs, deaths });
    GhostService.recordAttempt(this.levelDef.id, this.variantId, timeMs, this.ghostRecorder.finish());

    const wasStruggling = SystemMemory.snapshot().repeatDeathCount >= 2;
    SystemMemory.registerClear(this.levelDef.id, wasStruggling);
    PlayerProfile.integrate(this.behaviorTracker.finish(null, true));
    if (wasStruggling) Commentator.commentOnAdaptation();

    const next = getNextLevelId(this.levelDef.id);
    SaveService.markCompleted(this.levelDef.id);
    // Points PLAY at what comes after this level, not this level itself — so
    // returning to the main menu (Sector Complete's "back to menu", or simply
    // backing out) and pressing PLAY again continues the campaign instead of
    // replaying what's already done. Falls back to staying put at the last
    // level once there's no `next` (campaign end).
    if (next) SaveService.setLastLevelId(next);

    this.time.delayedCall(600, () => {
      if (isSectorFinale(this.levelDef.id)) {
        this.scene.start('SectorCompleteScene', {
          completedLevelId: this.levelDef.id,
          deaths: GameState.sector.deaths,
          timeMs: GameState.sectorElapsedMs(),
          nextLevelId: next,
        } satisfies SectorCompleteData);
      } else if (next) {
        this.scene.start('GameplayScene', { levelId: next });
      } else {
        this.scene.start('MainMenuScene');
      }
    });
  }
}
