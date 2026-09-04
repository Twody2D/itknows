// VISUAL RESET v1: the android is the game's single biggest, most contrast
// object on screen (master-prompt "big character" rule) — roughly 2.4x the
// old 10x14 frame. The physics hitbox (`Player.ts`) stays proportionally
// smaller and forgiving inside this, same as before, just scaled up with it.
export const PLAYER_SPRITE_W = 24;
export const PLAYER_SPRITE_H = 36;

export const PLAYER_FRAME_COUNTS: Record<string, number> = {
  idle: 2,
  run: 4,
  jump: 1,
  fall: 1,
  land: 1,
  hurt: 1,
  death: 1,
  victory: 2,
};
