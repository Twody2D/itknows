import type { DialogueLine } from './types';
import { EventBus } from '@/core/EventBus';
import { LocaleState } from '@/i18n/Locale';

/**
 * SYSTEM's shop-specific one-off lines (master-prompt §17) — a separate,
 * small shuffle-protected list, deliberately NOT routed through
 * `Commentator`'s death-priority cascade (that stays exactly as tested;
 * §17 says reuse the existing dialogue *infrastructure*, not the cascade
 * itself, which is specifically about death commentary). `ShopScene` is the
 * only caller.
 */
export type ShopCommentKind =
  | 'open'
  | 'purchase_confirmed'
  | 'insufficient_credits'
  | 'no_ads'
  | 'first_cosmetic'
  | 'browse_character'
  | 'browse_trail'
  | 'browse_death_fx'
  | 'browse_system'
  | 'browse_premium';

const SHOP_LINES: Record<ShopCommentKind, DialogueLine[]> = {
  open: [
    { id: 'shop-open-01', ru: 'Доступ к архиву открыт.', en: 'Archive access granted.' },
    { id: 'shop-open-02', ru: 'Смотри, не покупай лишнего.', en: "Look around. Don't overspend." },
  ],
  // One line per category, so the SYSTEM panel in the showroom always has
  // something on it (the mockup never shows it empty) instead of staying
  // blank until a purchase event happens to fire.
  browse_character: [
    { id: 'shop-browse-character-01', ru: 'Меняешь корпус. Внутри всё то же самое.', en: 'Changing the shell. The inside stays the same.' },
    { id: 'shop-browse-character-02', ru: 'Выбирай. Я всё равно узнаю тебя по прыжкам.', en: 'Pick one. I still know you by your jumps.' },
    { id: 'shop-browse-character-03', ru: 'Красивый корпус не отменяет шипы.', en: 'A pretty chassis does not cancel spikes.' },
  ],
  browse_trail: [
    { id: 'shop-browse-trail-01', ru: 'След из данных. Как будто мне сложно тебя найти.', en: 'A data trail. As if finding you were hard.' },
    { id: 'shop-browse-trail-02', ru: 'Хвост не ускоряет. Но выглядит быстро.', en: 'A tail adds no speed. It does look fast.' },
    { id: 'shop-browse-trail-03', ru: 'Оставляешь за собой мусор. Красивый мусор.', en: 'You leave litter behind you. Pretty litter.' },
  ],
  browse_death_fx: [
    { id: 'shop-browse-death_fx-01', ru: 'Ты выбираешь, как проигрывать. Это почти оптимизм.', en: 'You choose how to lose. That is almost optimism.' },
    { id: 'shop-browse-death_fx-02', ru: 'Практики у тебя много. Пусть будет красиво.', en: 'You get plenty of practice. Make it look good.' },
    { id: 'shop-browse-death_fx-03', ru: 'Финал один и тот же. Отличается только цвет.', en: 'The ending is the same. Only the color differs.' },
  ],
  browse_system: [
    { id: 'shop-browse-system-01', ru: 'Ты покупаешь мой характер. Необычный опыт для нас обоих.', en: 'You are buying my personality. New for us both.' },
    { id: 'shop-browse-system-02', ru: 'Могу говорить суше. Могу теплее. Решай.', en: 'I can be drier. Or warmer. Your call.' },
    { id: 'shop-browse-system-03', ru: 'Голос сменится. Наблюдение — нет.', en: 'The voice changes. The watching does not.' },
  ],
  browse_premium: [
    { id: 'shop-browse-premium-01', ru: 'Рекламу придумали не мы. Но убрать её можем.', en: 'We did not invent ads. We can remove them.' },
    { id: 'shop-browse-premium-02', ru: 'Один платёж. Больше я об этом не напомню.', en: 'One payment. I will not bring it up again.' },
    { id: 'shop-browse-premium-03', ru: 'Тишина между секторами. Оценишь позже.', en: 'Silence between sectors. You will get it later.' },
  ],
  purchase_confirmed: [
    { id: 'shop-purchase-01', ru: 'Покупка подтверждена.', en: 'Purchase confirmed.' },
    { id: 'shop-purchase-02', ru: 'Транзакция принята.', en: 'Transaction accepted.' },
  ],
  insufficient_credits: [
    { id: 'shop-insufficient-01', ru: 'Недостаточно данных. То есть кредитов.', en: 'Insufficient data. Credits, I mean.' },
    { id: 'shop-insufficient-02', ru: 'Играй больше. Или заплати.', en: 'Play more. Or pay.' },
  ],
  no_ads: [
    { id: 'shop-no_ads-01', ru: 'Рекламные протоколы отключены.', en: 'Advertisement protocols disabled.' },
    { id: 'shop-no_ads-02', ru: 'Тишина. Ненадолго ли ты к ней привыкнешь.', en: "Silence. Don't get too used to it." },
  ],
  first_cosmetic: [
    { id: 'shop-first_cosmetic-01', ru: 'Ты решил выделиться.', en: 'You chose to be different.' },
    { id: 'shop-first_cosmetic-02', ru: 'Внешний вид изменён. Поведение — нет.', en: 'Appearance changed. Behavior hasn’t.' },
  ],
};

const usedByKind = new Map<ShopCommentKind, Set<string>>();

/** Same shuffle-bag idea as `Commentator` (no repeat until the pool cycles), kept independent since this isn't death commentary. */
export function commentOnShop(kind: ShopCommentKind, rng: () => number = Math.random): void {
  const pool = SHOP_LINES[kind];
  let used = usedByKind.get(kind);
  if (!used || used.size >= pool.length) {
    used = new Set<string>();
    usedByKind.set(kind, used);
  }

  const candidates = pool.filter((line) => !(used as Set<string>).has(line.id));
  const chosen = candidates[Math.floor(rng() * candidates.length)] as DialogueLine;
  used.add(chosen.id);

  EventBus.emit('system:comment', { text: chosen[LocaleState.current], category: 'shop' });
}
