import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import type { InputState } from '@/utils/input/InputState';
import { inputState as sharedInputState } from '@/utils/input/InputState';
import { TouchControls } from '@/ui/components/TouchControls';
import { Player } from '@/gameplay/Player';
import { buildLevel } from '@/gameplay/Level';
import type { BuiltLevel } from '@/gameplay/Level';
import type { LevelDef } from '@/gameplay/LevelDef';
import { getLevel, getNextLevelId } from '@/gameplay/LevelFactory';
import { GameState } from '@/core/GameState';
import { EventBus } from '@/core/EventBus';
import type { DeathCause } from '@/core/EventBus';
import { BehaviorTracker } from '@/ai/BehaviorTracker';
import { PlayerProfile } from '@/ai/PlayerProfile';
import { SystemMemory } from '@/ai/SystemMemory';
import { selectVariant } from '@/ai/DifficultyDirector';
import { Commentator } from '@/ai/Commentator';
import { SystemVoice } from '@/ai/SystemVoice';
import { personalityTag } from '@/ai/SystemPersonality';

const SYSTEM_COMMENT_DISPLAY_MS = 2500;

interface GameplaySceneData {
  levelId: string;
}

/** Pixels of leeway when deciding whether the player was already above a one-way platform. */
const ONE_WAY_TOLERANCE = 4;

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
  private attemptStartMs = 0;
  private hesitationCommented = false;

  private hudDeathsText!: Phaser.GameObjects.Text;
  private hudSystemText!: Phaser.GameObjects.Text;
  /** Best-effort "which trap probably did this" — `Player.kill()` only carries a cause, not a trap id (see BehaviorTracker's doc comment for the same limitation). */
  private lastTriggeredTrapId: string | null = null;

  private resolving = false;

  constructor() {
    super('GameplayScene');
  }

  init(data: GameplaySceneData): void {
    // THE SYSTEM only ever picks a variant here, before the level is built —
    // never mid-attempt (CLAUDE.md #4.1, see DifficultyDirector's doc comment).
    this.variantId = selectVariant(data.levelId, PlayerProfile.snapshot(), SystemMemory.snapshot());
    this.levelDef = getLevel(data.levelId, this.variantId);
    this.resolving = false;
    this.hesitationCommented = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);

    if (GameState.currentLevelId !== this.levelDef.id) {
      GameState.currentLevelId = this.levelDef.id;
      GameState.startRun();
    }
    GameState.currentVariantId = this.variantId;

    this.level = buildLevel(this, this.levelDef);
    this.setupInput();
    this.behaviorTracker = new BehaviorTracker();
    this.attemptStartMs = this.time.now;
    EventBus.emit('level:loaded', { levelId: this.levelDef.id, variantId: this.variantId });

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y, this.inputState);

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

    this.setupTraps();

    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setDeadzone(this.scale.width * 0.2, this.scale.height * 0.3);
    this.cameras.main.setRoundPixels(true);

    this.buildHud();

    EventBus.on('player:died', this.handlePlayerDeath, this);
    EventBus.on('system:comment', this.handleSystemComment, this);
    EventBus.on('trap:triggered', this.handleTrapTriggered, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('player:died', this.handlePlayerDeath, this);
      EventBus.off('system:comment', this.handleSystemComment, this);
      EventBus.off('trap:triggered', this.handleTrapTriggered, this);
      this.touchControls?.destroy();
      this.behaviorTracker.destroy();
      for (const trap of this.level.traps.all) trap.destroy();
    });
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
    this.touchControls = new TouchControls(this, this.inputState);
  }

  /** master-prompt §70 — the version tag climbs with campaign progress, see SystemPersonality.ts. */
  private systemLabel(): string {
    return `SYSTEM ${personalityTag(this.levelDef.id)}`;
  }

  override update(time: number, delta: number): void {
    if (this.player.isAlive() && this.player.y > this.level.worldHeight + 40) {
      this.player.kill('fall');
    }

    for (const trap of this.level.traps.updatable) trap.update(time, delta);
    for (const pursuer of this.level.traps.pursuers) pursuer.update(this.player.x);
    this.carryOnMovingPlatforms();

    this.behaviorTracker.sample(time, delta, this.inputState, this.player.isAlive());
    if (!this.hesitationCommented) {
      const line = Commentator.commentOnHesitation(this.behaviorTracker.hesitationSoFarMs);
      if (line) this.hesitationCommented = true;
    }

    const voiceText = SystemVoice.current();
    const rendered = voiceText ? `${this.systemLabel()}: ${voiceText}` : '';
    if (this.hudSystemText.text !== rendered) this.hudSystemText.setText(rendered);
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
    this.add
      .text(8, 6, this.levelDef.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: hexToCss(PALETTE.white, 0.85),
      })
      .setScrollFactor(0)
      .setDepth(900);

    this.hudDeathsText = this.add
      .text(8, 18, `DEATHS ${GameState.run.deaths}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: hexToCss(PALETTE.danger, 0.85),
      })
      .setScrollFactor(0)
      .setDepth(900);

    const initialVoiceText = SystemVoice.current();
    this.hudSystemText = this.add
      .text(8, 30, initialVoiceText ? `${this.systemLabel()}: ${initialVoiceText}` : '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: hexToCss(PALETTE.system, 0.9),
        wordWrap: { width: this.scale.width - 16 },
      })
      .setScrollFactor(0)
      .setDepth(900);
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
  }

  private handlePlayerDeath(payload: { cause: DeathCause; x: number; y: number }): void {
    if (this.resolving) return;
    this.resolving = true;
    GameState.registerDeath();
    this.hudDeathsText.setText(`DEATHS ${GameState.run.deaths}`);

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
      this.scene.restart({ levelId: this.levelDef.id });
    });
  }

  private onExitReached(): void {
    if (this.resolving || !this.player.isAlive()) return;
    this.resolving = true;
    this.player.markVictory();

    const timeMs = GameState.elapsedMs();
    const deaths = GameState.run.deaths;
    EventBus.emit('level:completed', { levelId: this.levelDef.id, timeMs, deaths });

    const wasStruggling = SystemMemory.snapshot().repeatDeathCount >= 2;
    SystemMemory.registerClear(this.levelDef.id, wasStruggling);
    PlayerProfile.integrate(this.behaviorTracker.finish(null, true));
    if (wasStruggling) Commentator.commentOnAdaptation();

    this.time.delayedCall(600, () => {
      const next = getNextLevelId(this.levelDef.id);
      if (next) {
        this.scene.start('GameplayScene', { levelId: next });
      } else {
        this.scene.start('MainMenuScene');
      }
    });
  }
}
