import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SDK_INIT_TIMEOUT_MS, YandexGamesService, type YsdkLeaderboardEntry } from '@/services/YandexGamesService';
import { LeaderboardService } from '@/services/LeaderboardService';
import { PurchaseManager } from '@/services/PurchaseManager';

/**
 * The four SDK scenarios the game has to survive (CLAUDE.md #8: "игра
 * обязана полностью работать при отсутствующем/сломанном/медленном SDK") —
 * no SDK, a slow SDK, a declined authorization, and a leaderboard that is
 * there but will not answer.
 *
 * These drive the facade through its REAL boot path — a stand-in `window`
 * and `document`, a script tag that the test decides when (or whether) to
 * answer — rather than injecting an `ysdk` object past it. That matters
 * because two of the four scenarios are failures of that path itself: the
 * script never loading, and the script loading far too late. A test that
 * handed the facade a ready-made SDK could not tell either of them apart
 * from a healthy boot.
 */

interface FakeScript {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

interface LeaderboardCalls {
  setScore: Array<[string, number]>;
  getEntries: string[];
}

interface FakeSdkOptions {
  authorized?: boolean;
  /** Omitted entirely — an SDK build with no leaderboards at all. */
  withLeaderboards?: boolean;
  /** Every leaderboard call rejects — the board exists but the service behind it does not answer. */
  leaderboardsFail?: boolean;
  /** The board answers normally, with nobody on it yet — a real state on a freshly created board. */
  emptyBoard?: boolean;
  /** `openAuthDialog` rejects (player closed it) instead of resolving. */
  authRejects?: boolean;
  /** The dialog resolves but the player still is not signed in. */
  authResolvesUnauthorized?: boolean;
  paymentsFail?: boolean;
}

interface Harness {
  scripts: FakeScript[];
  readyCalls: number;
  leaderboard: LeaderboardCalls;
  setDataCalls: number;
  /** Answers the pending script tag with a working SDK — call whenever the scenario says the SDK arrives. */
  deliverSdk(options?: FakeSdkOptions): void;
  /** Answers it with a network failure — `onerror`, the only failure a script tag reports. */
  failScript(): void;
}

let harness: Harness;

function installFakeBrowser(): Harness {
  const scripts: FakeScript[] = [];
  const state: Harness = {
    scripts,
    readyCalls: 0,
    leaderboard: { setScore: [], getEntries: [] },
    setDataCalls: 0,
    deliverSdk: () => undefined,
    failScript: () => undefined,
  };

  // `window.self !== window.top` is how the facade recognises real Yandex
  // hosting (it always embeds the game in an iframe), so the stand-in has
  // to look embedded or nothing loads at all.
  const fakeWindow: Record<string, unknown> = {};
  fakeWindow.self = fakeWindow;
  fakeWindow.top = {};

  const fakeDocument = {
    createElement: (): FakeScript => {
      const script: FakeScript = { src: '', async: false, onload: null, onerror: null };
      scripts.push(script);
      return script;
    },
    head: { appendChild: (): void => undefined },
  };

  (globalThis as unknown as { window: unknown }).window = fakeWindow;
  (globalThis as unknown as { document: unknown }).document = fakeDocument;

  state.deliverSdk = (options: FakeSdkOptions = {}): void => {
    const authorized = options.authorized ?? false;
    const entry: YsdkLeaderboardEntry = { score: 12_345, rank: 1, player: { publicName: 'RUNNER' } };
    const failing = options.leaderboardsFail ?? false;

    const leaderboards = {
      setScore: async (name: string, score: number): Promise<void> => {
        if (failing) throw new Error('leaderboard unavailable');
        state.leaderboard.setScore.push([name, score]);
      },
      getEntries: async (name: string): Promise<{ entries: YsdkLeaderboardEntry[] }> => {
        if (failing) throw new Error('leaderboard unavailable');
        state.leaderboard.getEntries.push(name);
        return { entries: (options.emptyBoard ?? false) ? [] : [entry] };
      },
      getPlayerEntry: async (): Promise<YsdkLeaderboardEntry> => {
        if (failing) throw new Error('leaderboard unavailable');
        return entry;
      },
    };

    let isAuthorized = authorized;
    const player = {
      isAuthorized: (): boolean => isAuthorized,
      getData: async (): Promise<Record<string, unknown>> => ({ itknows: '{}' }),
      setData: async (): Promise<void> => {
        state.setDataCalls += 1;
      },
    };

    const sdk = {
      features: {
        LoadingAPI: {
          ready: (): void => {
            state.readyCalls += 1;
          },
        },
        GameplayAPI: { start: (): void => undefined, stop: (): void => undefined },
      },
      getPlayer: async (): Promise<typeof player> => player,
      getPayments: async (): Promise<unknown> => {
        if (options.paymentsFail ?? false) throw new Error('payments unavailable');
        return {
          getCatalog: async (): Promise<unknown[]> => [],
          purchase: async (): Promise<unknown> => ({ productID: 'x', purchaseToken: 't', developerPayload: '' }),
          getPurchases: async (): Promise<unknown[]> => [],
          consumePurchase: async (): Promise<void> => undefined,
        };
      },
      leaderboards: (options.withLeaderboards ?? true) ? leaderboards : undefined,
      auth: {
        openAuthDialog: async (): Promise<void> => {
          if (options.authRejects ?? false) throw new Error('dialog closed');
          if (!(options.authResolvesUnauthorized ?? false)) isAuthorized = true;
        },
      },
      serverTime: (): number => 1_700_000_000_000,
    };

    fakeWindow.YaGames = { init: async (): Promise<unknown> => sdk };
    const pending = scripts[scripts.length - 1];
    pending?.onload?.();
  };

  state.failScript = (): void => {
    const pending = scripts[scripts.length - 1];
    pending?.onerror?.();
  };

  return state;
}

function uninstallFakeBrowser(): void {
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { document?: unknown }).document;
}

/** Lets every already-resolved promise in the facade's own chain run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  YandexGamesService.resetForTests();
  harness = installFakeBrowser();
});

afterEach(() => {
  YandexGamesService.resetForTests();
  uninstallFakeBrowser();
  vi.useRealTimers();
});

describe('scenario: no SDK at all', () => {
  it('settles instead of hanging when the script fails to load, and never reports itself available', async () => {
    const init = YandexGamesService.init();
    harness.failScript();
    await expect(init).resolves.toBeUndefined();
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('never runs an onReady subscriber — cloud sync and purchase restoration simply do not happen', async () => {
    let ran = 0;
    YandexGamesService.onReady(() => {
      ran += 1;
    });
    const init = YandexGamesService.init();
    harness.failScript();
    await init;
    await vi.advanceTimersByTimeAsync(SDK_INIT_TIMEOUT_MS * 2);
    expect(ran).toBe(0);
  });

  it('does not even request the script outside an iframe — standalone hosting is not Yandex Games', async () => {
    (globalThis as unknown as { window: Record<string, unknown> }).window.top = (
      globalThis as unknown as { window: unknown }
    ).window;
    await YandexGamesService.init();
    expect(harness.scripts).toHaveLength(0);
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('keeps every read degrading to an empty answer rather than throwing', async () => {
    const init = YandexGamesService.init();
    harness.failScript();
    await init;

    // `null`, not `[]` — "could not be read" is a different thing to tell
    // the player than "nobody has posted a time yet" (see the facade).
    await expect(LeaderboardService.getLevelEntries('sector-01-level-01')).resolves.toBeNull();
    await expect(LeaderboardService.getPlayerLevelEntry('sector-01-level-01')).resolves.toBeNull();
    await expect(LeaderboardService.submitLevelScore('sector-01-level-01', 9000)).resolves.toBeUndefined();
    await expect(PurchaseManager.restorePurchases()).resolves.toBeUndefined();
    expect(PurchaseManager.isCatalogAvailable()).toBe(false);
  });
});

describe('scenario: a broken SDK', () => {
  it('treats a script that loads without defining YaGames as no SDK', async () => {
    const init = YandexGamesService.init();
    harness.scripts[0]?.onload?.();
    await expect(init).resolves.toBeUndefined();
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('treats a rejecting YaGames.init() as no SDK', async () => {
    const init = YandexGamesService.init();
    (globalThis as unknown as { window: Record<string, unknown> }).window.YaGames = {
      init: async (): Promise<never> => {
        throw new Error('sdk init failed');
      },
    };
    harness.scripts[0]?.onload?.();
    await expect(init).resolves.toBeUndefined();
    expect(YandexGamesService.isAvailable()).toBe(false);
  });
});

describe('scenario: a slow SDK', () => {
  it('settles on the timeout rather than waiting on a script that never answers', async () => {
    let settled = false;
    void YandexGamesService.init().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(SDK_INIT_TIMEOUT_MS - 100);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(settled).toBe(true);
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('still picks the SDK up when it lands after the timeout, and runs what was waiting on it', async () => {
    let readySubscriberRuns = 0;
    YandexGamesService.onReady(() => {
      readySubscriberRuns += 1;
    });

    void YandexGamesService.init();
    await vi.advanceTimersByTimeAsync(SDK_INIT_TIMEOUT_MS + 100);
    expect(YandexGamesService.isAvailable()).toBe(false);
    expect(readySubscriberRuns).toBe(0);

    harness.deliverSdk();
    await settle();

    expect(YandexGamesService.isAvailable()).toBe(true);
    expect(readySubscriberRuns).toBe(1);
  });

  it('fires LoadingAPI.ready() late rather than never when the menu was interactive first', async () => {
    YandexGamesService.notifyLoadingReady();
    void YandexGamesService.init();
    await vi.advanceTimersByTimeAsync(SDK_INIT_TIMEOUT_MS + 100);
    expect(harness.readyCalls).toBe(0);

    harness.deliverSdk();
    await settle();
    expect(harness.readyCalls).toBe(1);

    // Every later menu visit calls it again; the SDK must hear it once.
    YandexGamesService.notifyLoadingReady();
    YandexGamesService.notifyLoadingReady();
    expect(harness.readyCalls).toBe(1);
  });

  it('runs an onReady subscriber immediately once the SDK is already there', async () => {
    void YandexGamesService.init();
    harness.deliverSdk();
    await settle();

    let ran = 0;
    YandexGamesService.onReady(() => {
      ran += 1;
    });
    expect(ran).toBe(1);
  });
});

describe('scenario: authorization declined', () => {
  async function bootAsGuest(options: FakeSdkOptions = {}): Promise<void> {
    void YandexGamesService.init();
    harness.deliverSdk({ authorized: false, ...options });
    await settle();
  }

  it('reports failure when the player closes the dialog, and stays a guest', async () => {
    await bootAsGuest({ authRejects: true });
    await expect(YandexGamesService.requestAuthorization()).resolves.toBe(false);
    await expect(YandexGamesService.isPlayerAuthorized()).resolves.toBe(false);
  });

  it('reports failure when the dialog closes without signing in', async () => {
    await bootAsGuest({ authResolvesUnauthorized: true });
    await expect(YandexGamesService.requestAuthorization()).resolves.toBe(false);
  });

  it('submits no score and writes no cloud save for a guest, silently', async () => {
    await bootAsGuest({ authRejects: true });
    await YandexGamesService.requestAuthorization();

    await LeaderboardService.submitLevelScore('sector-01-level-01', 9000);
    await YandexGamesService.setPlayerData({ itknows: '{}' });

    expect(harness.leaderboard.setScore).toEqual([]);
    expect(harness.setDataCalls).toBe(0);
    await expect(YandexGamesService.getPlayerData(['itknows'])).resolves.toBeNull();
  });

  it('still lets a guest read a leaderboard — declining to sign in hides nothing', async () => {
    await bootAsGuest({ authRejects: true });
    await YandexGamesService.requestAuthorization();

    const entries = await LeaderboardService.getLevelEntries('sector-01-level-01');
    expect(entries).toHaveLength(1);
    expect(harness.leaderboard.getEntries).toEqual(['level-sector-01-level-01']);
  });

  it('starts submitting once the player does sign in, without a reload', async () => {
    await bootAsGuest();
    await expect(YandexGamesService.requestAuthorization()).resolves.toBe(true);

    await LeaderboardService.submitLevelScore('sector-01-level-01', 9000.4);
    expect(harness.leaderboard.setScore).toEqual([['level-sector-01-level-01', 9000]]);
  });
});

describe('scenario: leaderboard unavailable', () => {
  async function bootAuthorized(options: FakeSdkOptions = {}): Promise<void> {
    void YandexGamesService.init();
    harness.deliverSdk({ authorized: true, ...options });
    await settle();
  }

  it('reports "could not read", not "empty", when every leaderboard call rejects', async () => {
    await bootAuthorized({ leaderboardsFail: true });
    await expect(LeaderboardService.getLevelEntries('sector-01-level-01')).resolves.toBeNull();
    await expect(LeaderboardService.getSectorEntries('sector-01')).resolves.toBeNull();
    await expect(LeaderboardService.getPlayerLevelEntry('sector-01-level-01')).resolves.toBeNull();
  });

  it('reports an empty board as empty when the board itself answers with nobody on it', async () => {
    await bootAuthorized({ emptyBoard: true });
    await expect(LeaderboardService.getLevelEntries('sector-01-level-01')).resolves.toEqual([]);
  });

  it('swallows a failed submission — a lost score never interrupts the run', async () => {
    await bootAuthorized({ leaderboardsFail: true });
    await expect(LeaderboardService.submitLevelScore('sector-01-level-01', 9000)).resolves.toBeUndefined();
    await expect(LeaderboardService.submitSectorScore('sector-01', 60_000)).resolves.toBeUndefined();
  });

  it('degrades the same way when the SDK has no leaderboards at all', async () => {
    await bootAuthorized({ withLeaderboards: false });
    await expect(LeaderboardService.getLevelEntries('sector-01-level-01')).resolves.toBeNull();
    await expect(LeaderboardService.getPlayerLevelEntry('sector-01-level-01')).resolves.toBeNull();
    await expect(LeaderboardService.submitLevelScore('sector-01-level-01', 9000)).resolves.toBeUndefined();
  });

  it('keeps the rest of the SDK working while the board is down', async () => {
    await bootAuthorized({ leaderboardsFail: true });
    expect(YandexGamesService.isAvailable()).toBe(true);
    expect(YandexGamesService.getServerTime()).toBe(1_700_000_000_000);
    await expect(YandexGamesService.isPlayerAuthorized()).resolves.toBe(true);
    await expect(YandexGamesService.getPlayerData(['itknows'])).resolves.toEqual({ itknows: '{}' });
  });
});

describe('scenario: payments unavailable', () => {
  it('reports an empty catalog and a failed purchase instead of throwing', async () => {
    void YandexGamesService.init();
    harness.deliverSdk({ authorized: true, paymentsFail: true });
    await settle();

    await expect(YandexGamesService.getCatalog()).resolves.toEqual([]);
    await expect(YandexGamesService.purchase('credits_small')).resolves.toBeNull();
    await expect(YandexGamesService.getPurchases()).resolves.toEqual([]);
    await expect(YandexGamesService.consumePurchase('token')).resolves.toBeUndefined();
  });
});
