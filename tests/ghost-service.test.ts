import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GhostService } from '@/services/GhostService';
import { SaveService } from '@/services/SaveService';

vi.mock('@/services/SaveService', () => ({
  SaveService: {
    getGhost: vi.fn(() => null),
    saveGhostIfBest: vi.fn(),
  },
}));

describe('GhostService', () => {
  beforeEach(() => {
    vi.mocked(SaveService.getGhost).mockClear().mockReturnValue(null);
    vi.mocked(SaveService.saveGhostIfBest).mockClear();
  });

  it('keys the storage by level id alone', () => {
    GhostService.getGhost('sector-01-level-01');
    expect(SaveService.getGhost).toHaveBeenCalledWith('sector-01-level-01');
  });

  it("forwards a completed attempt's time and samples under that key", () => {
    GhostService.recordAttempt('sector-01-level-01', 5000, [0, 1, 2, 0, 100, 3, 4, 1]);
    expect(SaveService.saveGhostIfBest).toHaveBeenCalledWith('sector-01-level-01', 5000, [0, 1, 2, 0, 100, 3, 4, 1]);
  });

  it('never persists a trace too short to replay', () => {
    GhostService.recordAttempt('sector-01-level-01', 5000, [0, 1, 2, 0]);
    GhostService.recordAttempt('sector-01-level-01', 5000, []);
    expect(SaveService.saveGhostIfBest).not.toHaveBeenCalled();
  });

  it('keeps different levels under different keys', () => {
    GhostService.getGhost('sector-01-level-01');
    GhostService.getGhost('sector-02-level-03');
    expect(SaveService.getGhost).toHaveBeenNthCalledWith(1, 'sector-01-level-01');
    expect(SaveService.getGhost).toHaveBeenNthCalledWith(2, 'sector-02-level-03');
  });
});
