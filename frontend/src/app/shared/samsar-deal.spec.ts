import { applyDeal, dealLabel, sameDeal } from './samsar-deal';

describe('samsar deal', () => {
  it('labels both kinds of deal', () => {
    expect(dealLabel({ priceIncreaseTnd: 20 })).toBe('+20 TND');
    expect(dealLabel({ commissionPercent: 10, priceIncreaseTnd: 0 })).toBe('10 %');
  });

  it('compares a relation to a choice', () => {
    expect(sameDeal({ priceIncreaseTnd: 0, commissionPercent: 10 }, { commissionPercent: 10 })).toBeTrue();
    expect(sameDeal({ priceIncreaseTnd: 20 }, { priceIncreaseTnd: 20 })).toBeTrue();
    expect(sameDeal({ priceIncreaseTnd: 20 }, { priceIncreaseTnd: 30 })).toBeFalse();
    expect(sameDeal({ priceIncreaseTnd: 0, commissionPercent: 10 }, { priceIncreaseTnd: 10 })).toBeFalse();
  });

  it('switches a relation from one deal to the other', () => {
    const relation: { priceIncreaseTnd?: number | null; commissionPercent?: number | null } = { priceIncreaseTnd: 20 };
    applyDeal(relation, { commissionPercent: 10 });
    expect(relation).toEqual({ commissionPercent: 10, priceIncreaseTnd: 0 });
    applyDeal(relation, { priceIncreaseTnd: 30 });
    expect(relation.priceIncreaseTnd).toBe(30);
    expect(relation.commissionPercent).toBeUndefined();
  });
});
