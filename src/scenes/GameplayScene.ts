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
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { GameState } from '@/core/GameState';
import { EventBus } from '@/core/EventBus';

const ALL_LEVELS: LevelDef[] = [...SECTOR_01_LEVELS];

function findLevel(id: string): LevelDef {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level id: ${id}`);
  return level;
}

function nextLevelId(id: string): string | undefined {
  const index = ALL_LEVELS.findIndex((l) => l.id === id);
  return ALL_LEVELS[index + 1]?.id;
}

interface GameplaySceneData {
  levelId: string;
}

/** Pixels of leeway when deciding whether the player was already above a one-way platform. */
const ONE_WAY_TOLERANCE = 4;

/**
 * Owns one attempt at one level: spawns the player, builds geometry, wires
 * collisions, and resolves death/victory. Retry auto-restarts fast — the
 * SYSTEM commentary + explicit TRY AGAIN button arrive with the AI system
 * (Phase 3) and the polished result screen (Phase 4); until then this keeps
 * the death → retry loop honest and near-instant on its own.
 */
export class GameplayScene extends Phaser.Scene {
  private levelDef!: LevelDef;
  private level!: BuiltLevel;
  private player!: Player;
  private inputState!: InputState;
  private touchControls?: TouchControls;

  private hudDeathsText!: Phaser.GameObjects.Text;

  private resolving = false;

  constructor() {
    super('GameplayScene');
  }

  init(data: GameplaySceneData): void {
    this.levelDef = findLevel(data.levelId);
    this.resolving = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);

    if (GameState.currentLevelId !== this.levelDef.id) {
      GameState.currentLevelId = this.levelDef.id;
      GameState.startRun();
    }

    this.level = buildLevel(this, this.levelDef);
    this.setupInput();

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y, this.inputState);

    this.physics.world.setBounds(0, -400, this.level.worldWidth, this.level.worldHeight + 800);
    this.physics.add.collider(this.player, this.level.groundGroup);
    this.physics.add.collider(
      this.player,
      this.level.platformsGroup,
      undefined,
      (playerObj, platformObj) => this.isLandingOnPlatform(playerObj as Player, platformObj as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.player, this.level.spikesGroup, () => {
      this.player.kill('spike');
    });
    this.physics.add.overlap(this.player, this.level.exitZone, () => {
      this.onExitReached();
    });

    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setDeadzone(this.scale.width * 0.2, this.scale.height * 0.3);
    this.cameras.main.setRoundPixels(true);

    this.buildHud();

    EventBus.on('player:died', this.handlePlayerDeath, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('player:died', this.handlePlayerDeath, this);
      this.touchControls?.destroy();
    });
  }

  /**
   * Floating platforms are one-way: solid when landed on from above, passable
   * when approached from below or the side. Standard Arcade recipe — compare
   * the player's bottom edge before this step's vertical movement against the
   * platform's top edge (CLAUDE.md #Phase 1 — one-way platforms).
   */
  private isLandingOnPlatform(player: Player, platform: Phaser.Physics.Arcade.Sprite): boolean {
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    const previousBottom = player.body.bottom - player.body.deltaY();
    return previousBottom <= platformBody.top + ONE_WAY_TOLERANCE;
  }

  private setupInput(): void {
    this.input.keyboard?.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.inputState = sharedInputState;
    this.touchControls = new TouchControls(this, this.inputState);
  }

  override update(): void {
    if (this.player.isAlive() && this.player.y > this.level.worldHeight + 40) {
      this.player.kill('fall');
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
  }

  private handlePlayerDeath(): void {
    if (this.resolving) return;
    this.resolving = true;
    GameState.registerDeath();
    this.hudDeathsText.setText(`DEATHS ${GameState.run.deaths}`);

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

    this.time.delayedCall(600, () => {
      const next = nextLevelId(this.levelDef.id);
      if (next) {
        this.scene.start('GameplayScene', { levelId: next });
      } else {
        this.scene.start('MainMenuScene');
      }
    });
  }
}
