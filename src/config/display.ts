/**
 * Virtual resolution: height is fixed, width floats with the device aspect
 * ratio (CLAUDE.md #2). Levels are authored against VIRTUAL_HEIGHT; nothing
 * gameplay-critical may require more than MIN_VIRTUAL_WIDTH of horizontal space.
 */
export const VIRTUAL_HEIGHT = 270;
export const MIN_VIRTUAL_WIDTH = 480;
export const MAX_VIRTUAL_WIDTH = 620;

export const TILE_SIZE = 10;
