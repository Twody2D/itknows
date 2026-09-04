import { SaveService } from './SaveService';
import type { CreditEarnReason, CreditSpendReason } from '@/data/shop/economy';

/**
 * CREDITS — the shop's free/donated currency (master-prompt §2). One rule
 * that must never break: the balance the player sees is always exactly what
 * `SaveService` persists — no UI ever mutates it directly (§40), and every
 * change is clamped so a bad input can't produce a negative/NaN/Infinity
 * balance.
 */
class CurrencyServiceController {
  getBalance(): number {
    return SaveService.getCredits();
  }

  canAfford(amount: number): boolean {
    return Number.isFinite(amount) && amount >= 0 && this.getBalance() >= amount;
  }

  /** `reason` exists for analytics/debugging symmetry with `spendCredits` — not persisted anywhere, so it's fine for callers to pass 'dev' loosely. */
  earnCredits(amount: number, _reason: CreditEarnReason): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const next = Math.floor(this.getBalance() + amount);
    SaveService.setCredits(next);
  }

  /** Never lets the balance go negative — insufficient funds is a no-op returning `false`, not a partial/negative spend (master-prompt §6 Scenario B). */
  spendCredits(amount: number, _reason: CreditSpendReason): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (!this.canAfford(amount)) return false;
    SaveService.setCredits(this.getBalance() - Math.floor(amount));
    return true;
  }
}

export const CurrencyService = new CurrencyServiceController();
