// Shape of the rules the net engine reads (data/strauss-rules.json, ARCHITECTURE decisions 5 and 6).
// The loader in adapters/files converts the file into these types.

// [upper limit of the bracket, rate]; a null limit means no ceiling (last bracket)
export type TaxBracket = readonly [number | null, number];

export type ContributionRule = {
  threshold: number;
  ceiling: number;
  lowRate: number;
  highRate: number;
};

export type NetMethod = {
  basis: "monthly";
  taxYear: number;
  creditPointValue: number;
  brackets: readonly TaxBracket[];
  nationalInsurance: ContributionRule;
  health: ContributionRule;
  pensionCredit: { rate: number; maxContributionRate: number; incomeCeiling: number };
  contributionsBase: "gross";
  // The engine only supports this treatment; the loader (S1-T4) rejects a rules file that says otherwise
  participation: { treatment: "net_deduction"; reducesValueOfUse: false };
  rounding: { during: "none"; display: "shekel" };
};

export type ElectricRules = {
  netBonus: number;
  method: "gross_up" | "gross";
};
