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

  it('scopes the storage key to both levelId and variantId', () => {
    GhostService.getGhost('sector-01-level-01', 'gentle');
    expect(SaveService.getGhost).toHaveBeenCalledWith('sector-01-level-01::gentle');
  });

  it('forwards a completed attempt\'s time and samples under the scoped key', () => {
    GhostService.recordAttempt('sector-01-level-01', 'standard', 5000, [0, 1, 2, 0, 100, 3, 4, 1]);
    expect(SaveService.saveGhostIfBest).toHaveBeenCalledWith('sector-01-level-01::standard', 5000, [0, 1, 2, 0, 100, 3, 4, 1]);
  });

  it('never persists a trace too short to replay', () => {
    GhostService.recordAttempt('sector-01-level-01', 'standard', 5000, [0, 1, 2, 0]);
    GhostService.recordAttempt('sector-01-level-01', 'standard', 5000, []);
    expect(SaveService.saveGhostIfBest).not.toHaveBeenCalled();
  });

  it('keeps different variants of the same level under different keys', () => {
    GhostService.getGhost('sector-01-level-01', 'standard');
    GhostService.getGhost('sector-01-level-01', 'bold');
    expect(SaveService.getGhost).toHaveBeenNthCalledWith(1, 'sector-01-level-01::standard');
    expect(SaveService.getGhost).toHaveBeenNthCalledWith(2, 'sector-01-level-01::bold');
  });
});
