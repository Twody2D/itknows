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
export type ShopCommentKind = 'open' | 'purchase_confirmed' | 'insufficient_credits' | 'no_ads' | 'first_cosmetic';

const SHOP_LINES: Record<ShopCommentKind, DialogueLine[]> = {
  open: [
    { id: 'shop-open-01', ru: 'Доступ к архиву открыт.', en: 'Archive access granted.' },
    { id: 'shop-open-02', ru: 'Смотри, не покупай лишнего.', en: "Look around. Don't overspend." },
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
