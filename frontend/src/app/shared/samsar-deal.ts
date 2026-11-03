/**
 * What a samsar earns on a house: a fixed margin added per day to the house price,
 * or a commission on the total (the client pays the house price, the owner receives the rest).
 */
export interface SamsarDeal {
  priceIncreaseTnd?: number | null;
  commissionPercent?: number | null;
}

/** Choices offered to the owner, mirrored from the backend rules. */
export const SAMSAR_DEALS: SamsarDeal[] = [
  { priceIncreaseTnd: 10 },
  { priceIncreaseTnd: 20 },
  { priceIncreaseTnd: 30 },
  { commissionPercent: 10 },
];

/** Short label for buttons and badges: "+20 TND" or "10 %". */
export function dealLabel(deal: SamsarDeal): string {
  return deal.commissionPercent ? `${deal.commissionPercent} %` : `+${deal.priceIncreaseTnd || 0} TND`;
}

export function sameDeal(a: SamsarDeal, b: SamsarDeal): boolean {
  return (a.commissionPercent || 0) === (b.commissionPercent || 0)
    && (a.commissionPercent ? true : (a.priceIncreaseTnd || 0) === (b.priceIncreaseTnd || 0));
}

/** Copies a choice onto an existing relation after the server accepted it. */
export function applyDeal(target: SamsarDeal, deal: SamsarDeal): void {
  target.commissionPercent = deal.commissionPercent ?? undefined;
  target.priceIncreaseTnd = deal.commissionPercent ? 0 : deal.priceIncreaseTnd;
}
