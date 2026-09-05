import type { DialogueLine } from './types';
import { EventBus } from '@/core/EventBus';
import { LocaleState } from '@/i18n/Locale';

/**
 * SYSTEM's main-menu lines — a greeting on arrival, and one remark the first
 * time the player reaches for each secondary control.
 *
 * The point isn't flavour: it's the cheapest possible lesson that something
 * is watching, delivered where nothing is at stake. It never comments on the
 * primary path (PLAY), so it can't slow down the one thing a child came to
 * do.
 *
 * Same shape as `shop.ts` — its own shuffle bag, deliberately outside
 * `Commentator`'s death-priority cascade, which stays exactly as tested.
 * Lines live here rather than in the scene (CLAUDE.md #6).
 */
export type MenuCommentKind = 'greeting' | 'levels' | 'shop' | 'help' | 'settings' | 'skin';

const MENU_LINES: Record<MenuCommentKind, DialogueLine[]> = {
  greeting: [
    { id: 'menu-greeting-01', ru: 'Снова ты. Хорошо.', en: 'You again. Good.' },
    { id: 'menu-greeting-02', ru: 'Я ждал.', en: 'I was waiting.' },
    { id: 'menu-greeting-03', ru: 'Продолжим наблюдение.', en: 'Let us resume observation.' },
  ],
  levels: [
    { id: 'menu-levels-01', ru: 'Выбираешь, где ошибиться.', en: 'Choosing where to fail.' },
    { id: 'menu-levels-02', ru: 'Я помню каждый из них.', en: 'I remember every one of them.' },
  ],
  shop: [
    { id: 'menu-shop-01', ru: 'Внешность ничего не меняет.', en: 'Appearance changes nothing.' },
    { id: 'menu-shop-02', ru: 'Кредиты. Наконец-то понятная мотивация.', en: 'Credits. A motive I understand.' },
  ],
  help: [
    { id: 'menu-help-01', ru: 'Правила простые. Ты — нет.', en: 'The rules are simple. You are not.' },
    { id: 'menu-help-02', ru: 'Читай. Это редко помогает.', en: 'Read it. It rarely helps.' },
  ],
  settings: [
    { id: 'menu-settings-01', ru: 'Настройки? Смело.', en: 'Settings? Bold.' },
    { id: 'menu-settings-02', ru: 'Меняй что угодно. Кроме себя.', en: 'Change anything. Except yourself.' },
  ],
  skin: [
    { id: 'menu-skin-01', ru: 'Новый корпус. Та же ошибка.', en: 'A new chassis. The same mistake.' },
    { id: 'menu-skin-02', ru: 'Тебе идёт. Наверное.', en: 'It suits you. Probably.' },
  ],
};

const usedByKind = new Map<MenuCommentKind, Set<string>>();

/** Same no-repeat-until-the-pool-cycles bag as `Commentator`, kept independent since this isn't death commentary. */
export function commentOnMenu(kind: MenuCommentKind, rng: () => number = Math.random): void {
  const pool = MENU_LINES[kind];
  let used = usedByKind.get(kind);
  if (!used || used.size >= pool.length) {
    used = new Set<string>();
    usedByKind.set(kind, used);
  }

  const candidates = pool.filter((line) => !(used as Set<string>).has(line.id));
  const chosen = candidates[Math.floor(rng() * candidates.length)] as DialogueLine;
  used.add(chosen.id);

  EventBus.emit('system:comment', { text: chosen[LocaleState.current], category: 'menu' });
}

/** Test-only view of the pools — lets a sanity test assert coverage without exporting the mutable bag state. */
export const MENU_LINES_FOR_TEST: Readonly<Record<MenuCommentKind, readonly DialogueLine[]>> = MENU_LINES;
