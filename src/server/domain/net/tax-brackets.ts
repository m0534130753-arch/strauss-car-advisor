import type { TaxBracket } from "../model";

// Each bracket is [upper limit, rate] and covers the income above the previous limit; a null limit has no ceiling.
export function taxFromBrackets(taxableIncome: number, brackets: readonly TaxBracket[]): number {
  let tax = 0;
  let lowerLimit = 0;
  for (const [upperLimit, rate] of brackets) {
    const top = upperLimit ?? Number.POSITIVE_INFINITY;
    if (taxableIncome > lowerLimit) tax += (Math.min(taxableIncome, top) - lowerLimit) * rate;
    lowerLimit = top;
  }
  return tax;
}
