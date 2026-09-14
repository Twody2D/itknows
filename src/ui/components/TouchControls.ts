import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import type { InputState } from '@/utils/input/InputState';

/** Horizontal drag past this many px from the press point counts as a direction — small enough to feel immediate, big enough not to fire on an accidental thumb wobble. */
const MOVE_DEADZONE = 7;
/** Visual clamp only — direction is binary (CLAUDE.md #6, no analog gameplay value), this just keeps the thumb from rendering arbitrarily far from its base. */
const MOVE_THUMB_MAX = 26;
const MOVE_BASE_RADIUS = 22;
const JUMP_RING_RADIUS = 26;
/** Fraction of the screen width given to the move zone; the rest is the jump zone. */
const MOVE_ZONE_FRACTION = 0.5;
/** Top margin excluded from both zones — keeps them clear of the HUD strip and the pause button. */
const TOP_MARGIN = 40;

/**
 * Two full-region touch zones instead of small fixed buttons: press down
 * anywhere in the left half of the screen and a joystick base appears right
 * under the thumb; drag from there to move. Press anywhere in the right half
 * and a ripple appears there to jump. Nothing is drawn at a fixed screen
 * position while idle (only a faint static hint — see `drawIdleHints`), so
 * there's no control sitting on top of the player character regardless of
 * where a thumb naturally rests — the complaint the old fixed-circle layout
 * drew (CLAUDE.md #Yandex 1.6 — mobile controls must not obstruct play).
 *
 * Needs two simultaneous touch pointers (`main.ts`'s `input.activePointers`)
 * — one finger can be mid-drag on the move zone while another taps jump.
 * Both zones use `scene.input`'s pointer-id-scoped move/up events rather
 * than the zones' own `pointermove`/`pointerout`, because a drag routinely
 * leaves the zone's own hit area (dragging left past the zone's screen
 * center, or off the top/bottom) while the press should stay live until the
 * finger actually lifts.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private input: InputState;
  private graphics: Phaser.GameObjects.Graphics;
  private moveZone: Phaser.GameObjects.Zone;
  private jumpZone: Phaser.GameObjects.Zone;

  private movePointerId: number | null = null;
  private moveOrigin = { x: 0, y: 0 };
  private moveCurrent = { x: 0, y: 0 };

  private jumpPointerId: number | null = null;
  private jumpPoint = { x: 0, y: 0 };

  private readonly onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerUp: (pointer: Phaser.Input.Pointer) => void;
  private readonly onResize: () => void;

  constructor(scene: Phaser.Scene, input: InputState) {
    this.scene = scene;
    this.input = input;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(998);

    this.moveZone = scene.add.zone(0, 0, 0, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(997);
    this.jumpZone = scene.add.zone(0, 0, 0, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(997);

    this.moveZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onMoveDown(pointer));
    this.jumpZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onJumpDown(pointer));

    // Scene-level, not zone-level: a drag routinely carries the pointer
    // outside the zone's own hit area, and the press must stay live until
    // the finger actually lifts, wherever that happens.
    this.onPointerMove = (pointer) => this.handlePointerMove(pointer);
    this.onPointerUp = (pointer) => this.handlePointerUp(pointer);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);

    this.layout();
    // `scene.scale` is the GAME's ScaleManager, not the scene's own emitter:
    // it outlives every scene, so this subscription has to be taken back in
    // `destroy()` (see the note there) or it fires into a torn-down scene.
    this.onResize = () => this.layout();
    scene.scale.on('resize', this.onResize);
  }

  private onMoveDown(pointer: Phaser.Input.Pointer): void {
    if (this.movePointerId !== null) return;
    this.movePointerId = pointer.id;
    this.moveOrigin = { x: pointer.x, y: pointer.y };
    this.moveCurrent = { x: pointer.x, y: pointer.y };
    this.updateMoveInput();
    this.draw();
  }

  private onJumpDown(pointer: Phaser.Input.Pointer): void {
    if (this.jumpPointerId !== null) return;
    this.jumpPointerId = pointer.id;
    this.jumpPoint = { x: pointer.x, y: pointer.y };
    this.input.setTouchJump(true);
    this.draw();
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.movePointerId) return;
    this.moveCurrent = { x: pointer.x, y: pointer.y };
    this.updateMoveInput();
    this.draw();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.movePointerId) {
      this.movePointerId = null;
      this.input.setTouchLeft(false);
      this.input.setTouchRight(false);
      this.draw();
    }
    if (pointer.id === this.jumpPointerId) {
      this.jumpPointerId = null;
      this.input.setTouchJump(false);
      this.draw();
    }
  }

  private updateMoveInput(): void {
    const dx = this.moveCurrent.x - this.moveOrigin.x;
    this.input.setTouchLeft(dx <= -MOVE_DEADZONE);
    this.input.setTouchRight(dx >= MOVE_DEADZONE);
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    const splitX = width * MOVE_ZONE_FRACTION;

    this.moveZone.setPosition(0, TOP_MARGIN).setSize(splitX, height - TOP_MARGIN);
    this.jumpZone.setPosition(splitX, TOP_MARGIN).setSize(width - splitX, height - TOP_MARGIN);

    this.refreshHitArea(this.moveZone);
    this.refreshHitArea(this.jumpZone);

    this.draw();
  }

  /**
   * `setInteractive()` snapshots the zone's width/height into its hit area
   * once, at call time — resizing the zone afterward (`setSize`) does not
   * resize the hit area with it. Without this, both zones kept a 0x0 hit
   * area from construction (before the first real `layout()` sized them)
   * and silently accepted no touches at all.
   */
  private refreshHitArea(zone: Phaser.GameObjects.Zone): void {
    if (zone.input) {
      (zone.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, zone.width, zone.height);
    } else {
      zone.setInteractive();
    }
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    if (this.movePointerId !== null) {
      const dx = Phaser.Math.Clamp(this.moveCurrent.x - this.moveOrigin.x, -MOVE_THUMB_MAX, MOVE_THUMB_MAX);
      const thumbX = this.moveOrigin.x + dx;
      const thumbY = this.moveOrigin.y;
      const pressed = Math.abs(dx) >= MOVE_DEADZONE;

      g.fillStyle(PALETTE.white, 0.14);
      g.fillCircle(this.moveOrigin.x, this.moveOrigin.y, MOVE_BASE_RADIUS);
      g.lineStyle(1, PALETTE.white, 0.4);
      g.strokeCircle(this.moveOrigin.x, this.moveOrigin.y, MOVE_BASE_RADIUS);

      g.fillStyle(PALETTE.cyan, pressed ? 0.85 : 0.5);
      g.fillCircle(thumbX, thumbY, 9);
    } else {
      this.drawIdleHint(this.zoneCenter(this.moveZone), 'move');
    }

    if (this.jumpPointerId !== null) {
      g.fillStyle(PALETTE.cyan, 0.22);
      g.fillCircle(this.jumpPoint.x, this.jumpPoint.y, JUMP_RING_RADIUS);
      g.lineStyle(1.5, PALETTE.cyan, 0.9);
      g.strokeCircle(this.jumpPoint.x, this.jumpPoint.y, JUMP_RING_RADIUS);
    } else {
      this.drawIdleHint(this.zoneCenter(this.jumpZone), 'jump');
    }
  }

  private zoneCenter(zone: Phaser.GameObjects.Zone): { x: number; y: number } {
    // Weighted toward the lower third — where a thumb rests holding a phone
    // in landscape — not the geometric center of the whole zone.
    return { x: zone.x + zone.width / 2, y: zone.y + zone.height * 0.72 };
  }

  /** A faint, non-interactive marker so a first-time player can find each zone — never a hard-edged button, and it vanishes the instant that zone is actually pressed. */
  private drawIdleHint(at: { x: number; y: number }, kind: 'move' | 'jump'): void {
    const g = this.graphics;
    g.lineStyle(1, PALETTE.white, 0.22);
    g.strokeCircle(at.x, at.y, kind === 'move' ? MOVE_BASE_RADIUS : JUMP_RING_RADIUS);

    g.fillStyle(PALETTE.white, 0.3);
    if (kind === 'move') {
      for (const dir of [-1, 1] as const) {
        const x = at.x + dir * 10;
        for (let i = 0; i < 3; i++) g.fillRect(Math.round(x + dir * i) - (dir > 0 ? 0 : 1), Math.round(at.y - 2 + i), 1, 1);
      }
    } else {
      for (let i = 0; i < 4; i++) g.fillRect(Math.round(at.x - i - 0.5), Math.round(at.y - 3 + i), i * 2 + 1, 1);
      g.fillRect(Math.round(at.x - 1), Math.round(at.y + 1), 2, 4);
    }
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
    this.moveZone.setActive(visible);
    this.jumpZone.setActive(visible);
    if (this.moveZone.input) this.moveZone.input.enabled = visible;
    if (this.jumpZone.input) this.jumpZone.input.enabled = visible;
  }

  destroy(): void {
    // A finger can still be down when the scene tears down mid-transition
    // (e.g. landing on the exit with a thumb on the jump zone) — release
    // every button explicitly so the shared InputState never gets stuck
    // reporting a held input nothing can ever release again.
    this.input.setTouchLeft(false);
    this.input.setTouchRight(false);
    this.input.setTouchJump(false);

    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);

    // The one that was missing, and it was not harmless. Every death
    // restarts this scene, and each restart used to leave another live
    // `resize` handler behind on the game-wide ScaleManager, holding zones
    // that no longer exist. The next viewport change then ran `layout()`
    // on all of them — and on a phone a viewport change is not a rare
    // event: the address bar sliding away is one, so is a rotation, so is
    // the keyboard opening. Measured before the fix: four resizes after a
    // few deaths threw four TypeErrors out of `refreshHitArea`.
    this.scene.scale.off('resize', this.onResize);

    this.graphics.destroy();
    this.moveZone.destroy();
    this.jumpZone.destroy();
  }
}
