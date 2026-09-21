/**
 * Virtual resolution: height is fixed, width floats with the device aspect
 * ratio (CLAUDE.md #2). Levels are authored against VIRTUAL_HEIGHT; nothing
 * gameplay-critical may require more than MIN_VIRTUAL_WIDTH of horizontal space.
 */
export const VIRTUAL_HEIGHT = 270;
export const MIN_VIRTUAL_WIDTH = 480;

/**
 * The widest the canvas is allowed to get, and it is a hard platform limit
 * rather than a taste call: Yandex Games requirement 1.6.2.2 for desktop —
 * «Длинная сторона активного поля превосходит короткую не более чем в два
 * раза.» At the previous 620 the canvas was 2.30:1, and it was not a
 * theoretical breach: measured on the prod build, an ordinary 1920x1080
 * monitor with the browser's own toolbars open gives a 1920x937 viewport and
 * a 553x270 canvas — 2.05:1, over the line on the most common desktop there
 * is. A 2560x1080 ultrawide reached the full 2.30.
 *
 * 540 is exactly 2 x VIRTUAL_HEIGHT, so the ratio is at the limit and never
 * past it, at every viewport. The cost is 80 px of scenery on a wide screen;
 * it cannot cost gameplay, because nothing gameplay-critical may need more
 * than MIN_VIRTUAL_WIDTH across (CLAUDE.md #2) and the level itself is
 * MIN_VIRTUAL_WIDTH wide by construction — see `LEVEL_WIDTH_TILES`.
 */
export const MAX_VIRTUAL_WIDTH = VIRTUAL_HEIGHT * 2;

export const TILE_SIZE = 10;

/**
 * Level width in tiles — a level is exactly one screen wide and the camera
 * never scrolls (`GameplayScene.setupCameras`).
 *
 * Sized to the NARROWEST viewport, not the widest, and drawn at zoom 1. The
 * obvious-looking alternative — zooming by `scale.width / MIN_VIRTUAL_WIDTH`
 * so a wider level always fills the screen — was tried and is wrong: zoom is
 * uniform, so buying horizontal fit costs vertical fit, and at the widest
 * viewport it showed only 209 of the level's 270 rows (found live, with the
 * ground pushed off the bottom of the screen). Height is the axis levels are
 * designed against (CLAUDE.md #2), so it is the one that must never be cut.
 *
 * A wider screen therefore shows the same 480px of level plus `SIDE_WALL_PX`
 * of solid wall on each side — more scenery, never more level, so no player
 * gets an advantage from a wider phone.
 */
export const LEVEL_WIDTH_TILES = MIN_VIRTUAL_WIDTH / TILE_SIZE;

/**
 * Half the spare width on the widest possible viewport — how much wall is
 * drawn past each edge of the level so a wide screen shows terrain rather
 * than void. The player is stopped at the level's real edge by the physics
 * world bounds; the wall is what makes stopping there look deliberate.
 */
export const SIDE_WALL_PX = (MAX_VIRTUAL_WIDTH - MIN_VIRTUAL_WIDTH) / 2;
