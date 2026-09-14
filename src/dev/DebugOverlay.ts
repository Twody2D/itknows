import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { FxQuality } from '@/fx/FxSettings';
import { GameState } from '@/core/GameState';
import type { BuiltLevel } from '@/gameplay/Level';
import type { Player } from '@/gameplay/Player';
import type { LevelDef } from '@/gameplay/LevelDef';

const on = (value: boolean): string => (value ? 'on ' : 'off');

/**
 * The dev readout: FPS, the auto-degradation tier, hitboxes, and what the
 * player's own numbers currently say (TODO.md Phase 7).
 *
 * DEV-ONLY BY CONSTRUCTION. It is imported through a dynamic `import()`
 * behind `import.meta.env.DEV` in `GameplayScene`, the same shape as
 * `ShopDevTools` in `main.ts` — statically false in a production build, so
 * the bundler drops this file and everything it pulls in (CLAUDE.md #12: no
 * debug output ships).
 *
 * It exists because every measurement this project has needed so far was
 * taken by driving a headless browser from a script. That works on a desktop
 * and not at all on the device that actually matters — a real phone, where
 * the only way to read a frame rate is to put it on the screen. Toggled with
 * F3, off by default, and never on a touch control's own area.
 */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly boxes: Phaser.GameObjects.Graphics;
  private visible = false;
  private accMs = 0;
  private frames = 0;
  private fps = 0;
  private readonly scratch = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // A plain system-font Text, not the project's own bitmap font: this is
    // instrumentation, it never ships, and it has to stay legible at sizes
    // the pixel font cannot do.
    this.text = scene.add
      // Below the game's own HUD strip, not on top of it — the readout is
      // there to be compared against what the player sees, which needs both
      // legible at once.
      .text(4, 46, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7CFFB2',
        backgroundColor: '#000000cc',
        padding: { x: 3, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(9998)
      .setVisible(false);

    this.boxes = scene.add.graphics().setDepth(9997).setVisible(false);

    scene.input.keyboard?.on('keydown-F3', () => this.toggle());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  toggle(): void {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
    this.boxes.setVisible(this.visible);
    if (!this.visible) this.boxes.clear();
  }

  /**
   * Everything drawn here is gathered inside this file on purpose.
   *
   * It used to be assembled in `GameplayScene` and passed in, which left the
   * gathering loops in the production bundle — dead code behind a null
   * check, but shipped (CLAUDE.md #12). Now the scene's whole contribution
   * is one optional call, and `import.meta.env.DEV` erases it.
   *
   * The player's hurt box is NOT a physics body — it is swept by hand
   * (`GameplayScene.sweepLethalContact`) — and neither are the trigger and
   * exit zones, which is exactly why they are worth drawing.
   */
  update(deltaMs: number, level: BuiltLevel, player: Player, levelDef: LevelDef): void {
    this.accMs += deltaMs;
    this.frames += 1;
    if (this.accMs >= 500) {
      this.fps = Math.round((this.frames * 1000) / this.accMs);
      this.accMs = 0;
      this.frames = 0;
    }
    if (!this.visible) return;

    this.text.setText(
      [
        `fps ${String(this.fps).padStart(2)}   tier ${FxQuality.tier}`,
        `${levelDef.id}  ${levelDef.name}`,
        `deaths run ${GameState.run.deaths}  sector ${GameState.sector.deaths}`,
        `particles ${on(FxQuality.particlesAllowed())} backdrop ${on(FxQuality.backdropAllowed())} shake ${on(FxQuality.screenEffectsAllowed())}`,
      ].join('\n'),
    );

    const g = this.boxes;
    g.clear();
    const outline = (x: number, y: number, w: number, h: number, color: number): void => {
      g.lineStyle(1, color, 0.9);
      g.strokeRect(x, y, w, h);
    };

    const body = player.body as Phaser.Physics.Arcade.Body;
    outline(body.x, body.y, body.width, body.height, PALETTE.cyan);
    const hurt = player.hurtBounds(this.scratch);
    outline(hurt.x, hurt.y, hurt.width, hurt.height, PALETTE.reward);

    for (const spike of level.spikesGroup.getChildren()) {
      const spikeBody = (spike as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (spikeBody?.enable) outline(spikeBody.x, spikeBody.y, spikeBody.width, spikeBody.height, PALETTE.danger);
    }
    for (const hazard of level.traps.lethalHazards) {
      if (!hazard.isLethal()) continue;
      const hazardBody = (hazard.gameObject as Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body | null }).body;
      if (hazardBody?.enable) outline(hazardBody.x, hazardBody.y, hazardBody.width, hazardBody.height, PALETTE.danger);
    }
    for (const trigger of level.traps.triggers) {
      outline(trigger.bounds.x, trigger.bounds.y, trigger.bounds.width, trigger.bounds.height, PALETTE.system);
    }
    for (const exit of level.traps.fakeExits) {
      outline(exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height, PALETTE.system);
    }
    outline(level.exitZone.x, level.exitZone.y, level.exitZone.width, level.exitZone.height, PALETTE.cyan);
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown-F3');
    this.text.destroy();
    this.boxes.destroy();
  }
}
