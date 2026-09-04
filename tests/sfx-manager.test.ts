import { describe, expect, it } from 'vitest';
import { playSfx } from '@/audio/SfxManager';

/**
 * `AudioContext` doesn't exist under Vitest's `node` environment (see
 * `AudioEngine`'s doc comment) — this only proves every patch degrades to a
 * silent no-op instead of throwing when there's nowhere to actually play a
 * sound. Real audio output is a headless-browser/manual concern, same
 * testing-scope split `FxManager` and every other render-dependent system
 * already draws (CLAUDE.md #1 — "тесты — только логика").
 */
describe('SfxManager.playSfx', () => {
  const names = [
    'jump',
    'land',
    'death',
    'trapWarning',
    'trapTrigger',
    'levelComplete',
    'checkpoint',
    'uiClick',
  ] as const;

  it.each(names)('does not throw for "%s" with no AudioContext available', (name) => {
    expect(() => playSfx(name)).not.toThrow();
  });
});
