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
import type { BuiltLevel } from '@/gameplay/Level';
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
import { SIDE_WALL_PX, TILE_SIZE } from '@/config/display';
import { formatMmSs } from '@/utils/formatTime';
import { t } from '@/i18n/ui';

const SYSTEM_COMMENT_DISPLAY_MS = 3800;


interface GameplaySceneData {
  levelId: string;
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
   * How long this attempt has actually been played, accumulated from
   * `update()`'s own delta rather than measured against a start timestamp.
   *
   * It has to be an accumulator, because every clock that could stand in
   * for one here keeps running while the scene is paused: `update`'s
   * `time` argument is the *game* loop's, so a minute spent reading the
   * pause card came back on the HUD the instant play resumed (owner:
   * "время, которое слева сверху, не останавливает счёт во время паузы").
   * A paused scene simply isn't ticked, so a sum of deltas cannot count
   * time the player didn't play — the same claim `GameState`'s wall clock
   * makes by subtracting `pausedMs`, and the two now agree.
   *
   * Starting at 0 in `create()` also drops an old trap: a scene's own
   * `this.time.now` reads 0 during `create()`, so a timestamp captured
   * there made the session's very first level time from page load.
   */
  private attemptElapsedMs = 0;
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
  /** Best-effort "which trap probably did this" — `Player.kill()` only carries a cause, not a trap id (see BehaviorTracker's doc comment for the same limitation). */
  private lastTriggeredTrapId: string | null = null;

  /** Scratch rectangles for `sweepLethalContact` — reused, never reallocated (CLAUDE.md #9). */
  private readonly hurtRect = new Phaser.Geom.Rectangle();
  private readonly hazardRect = new Phaser.Geom.Rectangle();

  private fx!: FxManager;
  /** id → hazard game object, built once per level so warning-pulse can find the right visual from `trap:armed`'s id-only payload. */
  private hazardById = new Map<string, Phaser.GameObjects.GameObject & { alpha: number }>();

  private resolving = false;
  private tutorialHints?: TutorialHints;
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
    this.attemptElapsedMs = 0;
    this.ghostRecorder.reset();
    EventBus.emit('level:loaded', { levelId: this.levelDef.id, variantId: this.variantId });
    MusicSequencer.start();
    // The game now opens straight into a level rather than the menu
    // (`BootScene`), so this is where "loaded and actually playable" happens
    // on a cold start. Idempotent inside the service — only the first call of
    // the session reaches the SDK, whether it comes from here or the menu
    // (CLAUDE.md #8).
    YandexGamesService.notifyLoadingReady();
    YandexGamesService.notifyGameplayStart();
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);

    const spawnX = this.level.spawn.x;

    // Ghost and trail are pure visual overlays — created before the player
    // so draw order never lets either cover the real character (master-
    // prompt §40 for the ghost; the trail is shop cosmetic content).
    const ghostRecord = GhostSettings.enabled ? GhostService.getGhost(this.levelDef.id, this.variantId) : null;
    this.ghostSprite = ghostRecord ? new GhostSprite(this, ghostRecord.samples) : null;

    this.trailFx = new TrailFx(this, equippedTrailKind(), spawnX, this.level.spawn.y);

    this.player = new Player(this, spawnX, this.level.spawn.y, this.inputState);

    // Ceiling at the top of the screen, floor far below it. The level is
    // exactly one screen and the camera never scrolls, so there is no
    // off-screen "up" to jump into any more — without the top bound the
    // player would sail out of the frame and come back down blind. The
    // bottom stays deep so a pit is still a real fall with a real death
    // (`update()` kills at `worldHeight + 40`), not a landing.
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight + 800);
    this.physics.add.collider(this.player, this.level.groundGroup);
    this.physics.add.collider(this.player, this.level.platformsGroup, undefined, (playerObj, platformObj) =>
      this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.player, this.level.exitZone, () => {
      this.onExitReached();
    });

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
   * Two cameras: the world camera, zoomed so one screen of world is exactly
   * one level, and a UI camera at 1:1 that draws the HUD, the pause button,
   * touch controls and SYSTEM commentary.
   *
   * THE WORLD CAMERA DOES NOT MOVE. A level is `LEVEL_WIDTH_TILES` wide and
   * `LEVEL_HEIGHT_TILES` tall, the zoom makes that exactly the viewport, so
   * there is nothing to scroll to: the player sees the whole level, every
   * hazard on it and the exit, from the spawn point and for the whole
   * attempt. That is the point of the one-screen format (`LevelDef`) — the
   * level itself is the warning, so a death can always be traced back to
   * something that was on screen the entire time.
   *
   * Zooming the single camera the scene used to have would have scaled the
   * HUD and the thumb buttons with it, which is the opposite of what's
   * wanted — hence the separate 1:1 UI camera below.
   */
  private setupCameras(): void {
    const main = this.cameras.main;

    // Zoom 1, always. The camera is wider than the level on anything but the
    // narrowest viewport, so the level is centred and the spare width shows
    // the side walls `buildLevel` draws past its edges. Bounds are widened by
    // the same amount, since a bound at the level's own edge would refuse the
    // negative scroll that centring needs.
    main.setBounds(-SIDE_WALL_PX, 0, this.level.worldWidth + SIDE_WALL_PX * 2, this.level.worldHeight);
    main.setZoom(1);
    main.stopFollow();
    main.setScroll((this.level.worldWidth - this.scale.width) / 2, 0);
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
        () => {
          platform.notifyStandingOn();
          // Riding a floor that has already let go is not footing: no jump
          // off it, no coyote time after it. The escape was the warning
          // phase, and it has been and gone.
          if (platform.isCollapsing()) this.player.notifyFootingCollapsed();
        },
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
    this.attemptElapsedMs += delta;

    if (this.player.isAlive() && this.player.y > this.level.worldHeight + 40) {
      this.player.kill('fall');
    }

    for (const trap of this.level.traps.updatable) trap.update(time, delta);
    for (const pursuer of this.level.traps.pursuers) pursuer.update(this.player.x, delta);
    this.carryOnMovingPlatforms();
    this.sweepLethalContact();
    this.tutorialHints?.update();

    const attemptElapsedMs = this.attemptElapsedMs;
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
  }

  /**
   * Kills the player when a live hazard touches the android's visible core.
   *
   * This used to be two `physics.add.overlap` registrations against the
   * player's own body — and that body is a 6x12 box at the feet, sized for
   * ledges and gap widths, not for the 24x36 android drawn around it. The
   * result was a character whose head and torso could not be hurt at all:
   * the owner sent a screenshot of a moving spike buried in the android's
   * chest with the android walking on. `Player.hurtBounds` is the shape
   * that should decide this, so the sweep is done here by hand.
   *
   * Hazards are a handful per level and every rectangle is reused, so this
   * costs a few AABB tests a frame and allocates nothing.
   */
  private sweepLethalContact(): void {
    if (!this.player.isAlive()) return;
    const hurt = this.player.hurtBounds(this.hurtRect);

    for (const spike of this.level.spikesGroup.getChildren()) {
      const body = (spike as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (!body || !body.enable) continue;
      if (Phaser.Geom.Rectangle.Overlaps(hurt, this.hazardRect.setTo(body.x, body.y, body.width, body.height))) {
        this.player.kill('spike');
        return;
      }
    }

    for (const hazard of this.level.traps.lethalHazards) {
      if (!hazard.isLethal()) continue;
      const body = (hazard.gameObject as Phaser.GameObjects.GameObject & {
        body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
      }).body;
      if (!body || !body.enable) continue;
      if (Phaser.Geom.Rectangle.Overlaps(hurt, this.hazardRect.setTo(body.x, body.y, body.width, body.height))) {
        this.player.kill('trap');
        return;
      }
    }
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

    const attemptElapsedMs = this.attemptElapsedMs;
    const trapId = payload.cause === 'trap' ? this.lastTriggeredTrapId : null;
    SystemMemory.registerDeath(this.levelDef.id, payload.cause, trapId);
    PlayerProfile.integrate(this.behaviorTracker.finish(payload.cause, false));
    Commentator.commentOnDeath({
      cause: payload.cause,
      attemptElapsedMs,
      totalDeaths: GameState.run.deaths,
      repeatDeathCount: SystemMemory.snapshot().repeatDeathCount,
      progressFraction: this.progressToExit(payload.x, payload.y),
    });

    this.time.delayedCall(450, () => {
      this.scene.restart({ levelId: this.levelDef.id });
    });
  }

  /**
   * How close an attempt got to the exit — 0 at the spawn point, 1 at the
   * door — as straight-line distance rather than horizontal position.
   *
   * This feeds THE SYSTEM's `near_exit` commentary, and horizontal position
   * stopped meaning anything the moment levels became one screen and started
   * being built upward (`LevelDef`). On a climb the exit is often almost
   * directly above the spawn, so `x / worldWidth` would have called a death
   * at the bottom of the ladder "nearly there" — the one kind of mistake
   * that makes a commentator sound like it is not watching the same game.
   */
  private progressToExit(x: number, y: number): number {
    const exit = this.level.exitZone;
    const fromSpawn = Phaser.Math.Distance.Between(this.level.spawn.x, this.level.spawn.y, exit.x, exit.y);
    if (fromSpawn <= 0) return 1;
    const remaining = Phaser.Math.Distance.Between(x, y, exit.x, exit.y);
    return Phaser.Math.Clamp(1 - remaining / fromSpawn, 0, 1);
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
