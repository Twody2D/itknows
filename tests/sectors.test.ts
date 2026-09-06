import { describe, expect, it } from 'vitest';
import { sectorIdOf } from '@/gameplay/sectors';

describe('sectorIdOf', () => {
  it('derives a zero-padded sector-XX id from a level id', () => {
    expect(sectorIdOf('sector-01-level-01')).toBe('sector-01');
    expect(sectorIdOf('sector-01-level-06')).toBe('sector-01');
    expect(sectorIdOf('sector-05-level-03')).toBe('sector-05');
  });
});
