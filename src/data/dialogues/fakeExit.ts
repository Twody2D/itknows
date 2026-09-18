import type { DialogueLine } from './types';
import { EventBus } from '@/core/EventBus';
import { LocaleState } from '@/i18n/Locale';

/**
 * What SYSTEM says when the decoy door takes someone.
 *
 * These exist because the trap moves the player without killing them, and a
 * player who is silently relocated reads that as a bug rather than as
 * something that was done to them. The line is the receipt: it names the
 * door as the cause in the same beat the screen flashes.
 *
 * Own shuffle bag, outside `Commentator`'s death-priority cascade — nobody
 * died, so none of the death categories apply (same arrangement as
 * `menu.ts`/`shop.ts`). Lines live here, never in gameplay code
 * (CLAUDE.md #6/#7).
 */
const FAKE_EXIT_LINES: DialogueLine[] = [
  { id: 'fake_exit-01', ru: 'Не та дверь.', en: 'Wrong door.' },
  { id: 'fake_exit-02', ru: 'Она открылась. Не туда.', en: 'It opened. Elsewhere.' },
  { id: 'fake_exit-03', ru: 'Выход был выше. Он и сейчас выше.', en: 'The exit was above. It still is.' },
  { id: 'fake_exit-04', ru: 'Ты проверил. Теперь иди обратно.', en: 'You checked. Now walk back.' },
  { id: 'fake_exit-05', ru: 'Тёмное ядро значит «нет».', en: 'An unlit core means no.' },
  { id: 'fake_exit-06', ru: 'Дверь запомнила тебя.', en: 'The door remembered you.' },
];

const used = new Set<string>();

/** Same no-repeat-until-the-pool-cycles bag as `Commentator`, kept independent since this isn't death commentary. */
export function commentOnFakeExit(rng: () => number = Math.random): void {
  if (used.size >= FAKE_EXIT_LINES.length) used.clear();

  const candidates = FAKE_EXIT_LINES.filter((line) => !used.has(line.id));
  const chosen = candidates[Math.floor(rng() * candidates.length)] as DialogueLine;
  used.add(chosen.id);

  EventBus.emit('system:comment', { text: chosen[LocaleState.current], category: 'fake_exit' });
}

/** Test-only view of the pool — lets a sanity test assert coverage without exporting the mutable bag state. */
export const FAKE_EXIT_LINES_FOR_TEST: readonly DialogueLine[] = FAKE_EXIT_LINES;
