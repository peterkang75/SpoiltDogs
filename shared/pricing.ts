// Shared pricing utilities used by both server (bulk recalculation) and
// client (live calculator preview). Keep this file pure — no DB or React.

export const STRIPE_RATE = 0.0175;
export const STRIPE_FIXED = 0.30;

export interface ProfitabilityResult {
  totalCost: number;
  minPrice: number;
  rounded: number;
  stripeFee: number;
  netProfit: number;
  actualMargin: number;
}

// Rounds to the nearest charm price ending in .90 within roughly ±5%.
// Examples (per spec):
//   20.00 → 19.90
//   17.45 → 17.90
//   24.99 → 24.90
//   25.50 → 25.90
// Picks the .90 candidate at any whole-dollar boundary closest to the input.
export function attractiveRound(price: number): number {
  if (!isFinite(price) || price <= 0) return 0;
  const base = Math.floor(price);
  const candidates: number[] = [];
  for (let d = -2; d <= 2; d++) {
    const c = base + d + 0.9;
    if (c > 0) candidates.push(c);
  }
  let best = candidates[0];
  let bestDiff = Math.abs(price - best);
  for (const c of candidates) {
    const diff = Math.abs(price - c);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return Math.round(best * 100) / 100;
}

// Computes the price that delivers a given net margin after Stripe fees,
// then snaps it to a charm price. Returns null when the margin is
// mathematically unreachable (denominator non-positive).
export function calcProfitability(
  sourcingCost: number,
  shippingCost: number,
  marginPct: number,
): ProfitabilityResult | null {
  const totalCost = sourcingCost + shippingCost;
  if (marginPct >= 100) return null;
  const denominator = 1 - marginPct / 100 - STRIPE_RATE;
  if (denominator <= 0) return null;
  const minPrice = totalCost / denominator + STRIPE_FIXED;
  const rounded = attractiveRound(minPrice);
  const stripeFee = rounded * STRIPE_RATE + STRIPE_FIXED;
  const netProfit = rounded - totalCost - stripeFee;
  const actualMargin = rounded > 0 ? (netProfit / rounded) * 100 : 0;
  return { totalCost, minPrice, rounded, stripeFee, netProfit, actualMargin };
}

// Convenience for callers that only need the AUD cents price.
// Returns null if calc cannot satisfy the margin.
export function suggestPriceCents(
  sourcingCostCents: number,
  shippingCostCents: number,
  marginPct: number,
): number | null {
  const result = calcProfitability(
    sourcingCostCents / 100,
    shippingCostCents / 100,
    marginPct,
  );
  if (!result) return null;
  return Math.round(result.rounded * 100);
}
