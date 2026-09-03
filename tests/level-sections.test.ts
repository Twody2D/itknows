import { describe, expect, it } from 'vitest';
import { validateSections } from '@/gameplay/LevelSections';
import { getAllLevels } from '@/gameplay/LevelFactory';

describe('validateSections', () => {
  it('accepts an undefined or empty section list', () => {
    expect(validateSections(40, undefined).valid).toBe(true);
    expect(validateSections(40, []).valid).toBe(true);
  });

  it('accepts sections that contiguously cover the full width', () => {
    const result = validateSections(30, [
      { id: 'a', type: 'intro', fromCol: 0, toCol: 9 },
      { id: 'b', type: 'challenge', fromCol: 10, toCol: 19 },
      { id: 'c', type: 'final', fromCol: 20, toCol: 29 },
    ]);
    expect(result.valid).toBe(true);
  });

  it('rejects a gap between sections', () => {
    const result = validateSections(30, [
      { id: 'a', type: 'intro', fromCol: 0, toCol: 9 },
      { id: 'b', type: 'final', fromCol: 11, toCol: 29 },
    ]);
    expect(result.valid).toBe(false);
  });

  it('rejects overlapping sections', () => {
    const result = validateSections(30, [
      { id: 'a', type: 'intro', fromCol: 0, toCol: 15 },
      { id: 'b', type: 'final', fromCol: 10, toCol: 29 },
    ]);
    expect(result.valid).toBe(false);
  });

  it('rejects sections that stop short of the level width', () => {
    const result = validateSections(30, [{ id: 'a', type: 'intro', fromCol: 0, toCol: 20 }]);
    expect(result.valid).toBe(false);
  });

  it('rejects sections that overshoot the level width', () => {
    const result = validateSections(30, [{ id: 'a', type: 'intro', fromCol: 0, toCol: 35 }]);
    expect(result.valid).toBe(false);
  });

  it('rejects a section whose toCol is before its fromCol', () => {
    const result = validateSections(30, [{ id: 'a', type: 'intro', fromCol: 10, toCol: 5 }]);
    expect(result.valid).toBe(false);
  });
});

describe('every level with sections declared', () => {
  for (const level of getAllLevels()) {
    if (!level.sections) continue;
    it(`${level.id}: sections contiguously cover the level's width`, () => {
      const result = validateSections(level.width, level.sections);
      expect(result.valid, result.reason).toBe(true);
    });
  }
});
