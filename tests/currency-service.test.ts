import { beforeEach, describe, expect, it } from 'vitest';
import { CurrencyService } from '@/services/CurrencyService';
import { SaveService } from '@/services/SaveService';

describe('CurrencyService', () => {
  beforeEach(() => {
    SaveService.resetForTests();
  });

  it('starts at zero', () => {
    expect(CurrencyService.getBalance()).toBe(0);
  });

  it('earns credits', () => {
    CurrencyService.earnCredits(10, 'level_complete');
    expect(CurrencyService.getBalance()).toBe(10);
    CurrencyService.earnCredits(25, 'sector_complete');
    expect(CurrencyService.getBalance()).toBe(35);
  });

  it('ignores non-positive or non-finite earn amounts instead of corrupting the balance', () => {
    CurrencyService.earnCredits(10, 'level_complete');
    CurrencyService.earnCredits(0, 'level_complete');
    CurrencyService.earnCredits(-5, 'level_complete');
    CurrencyService.earnCredits(NaN, 'level_complete');
    CurrencyService.earnCredits(Infinity, 'level_complete');
    expect(CurrencyService.getBalance()).toBe(10);
  });

  it('floors a fractional earn amount', () => {
    CurrencyService.earnCredits(10.9, 'level_complete');
    expect(CurrencyService.getBalance()).toBe(10);
  });

  it('reports affordability against the current balance', () => {
    CurrencyService.earnCredits(100, 'level_complete');
    expect(CurrencyService.canAfford(100)).toBe(true);
    expect(CurrencyService.canAfford(101)).toBe(false);
  });

  it('spends credits when affordable', () => {
    CurrencyService.earnCredits(100, 'level_complete');
    expect(CurrencyService.spendCredits(40, 'shop_item')).toBe(true);
    expect(CurrencyService.getBalance()).toBe(60);
  });

  it('refuses to spend below zero — no partial spend, no negative balance', () => {
    CurrencyService.earnCredits(10, 'level_complete');
    expect(CurrencyService.spendCredits(11, 'shop_item')).toBe(false);
    expect(CurrencyService.getBalance()).toBe(10);
  });

  it('refuses a non-positive or non-finite spend', () => {
    CurrencyService.earnCredits(10, 'level_complete');
    expect(CurrencyService.spendCredits(0, 'shop_item')).toBe(false);
    expect(CurrencyService.spendCredits(-1, 'shop_item')).toBe(false);
    expect(CurrencyService.spendCredits(NaN, 'shop_item')).toBe(false);
    expect(CurrencyService.getBalance()).toBe(10);
  });
});
