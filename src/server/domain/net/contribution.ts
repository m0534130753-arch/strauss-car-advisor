import type { ContributionRule } from "../model";

// National insurance and health: the low rate up to the threshold, the high rate above it, nothing above the ceiling.
export function contribution(taxableIncome: number, rule: ContributionRule): number {
  const base = Math.min(taxableIncome, rule.ceiling);
  const lowPart = Math.min(base, rule.threshold);
  const highPart = Math.max(0, base - rule.threshold);
  return lowPart * rule.lowRate + highPart * rule.highRate;
}
