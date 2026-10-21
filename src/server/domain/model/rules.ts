import type { Group } from "./group";

// Shape of the rules the business logic reads (data/strauss-rules.json, ARCHITECTURE decisions 5 and 6).
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

export type FamilyTrackRules = {
  minChildren: number;
  childMaxAge: number;
  cars: readonly string[]; // catalog vehicle ids
  gapSplitEmployee: number; // the employee's share of the gap above the group budget
};

export type WaiverRules = {
  maintenanceIsTaxable: boolean;
  maintenanceIsPensionable: boolean;
};

// Everything the business logic reads from data/strauss-rules.json (ARCHITECTURE decision 5).
export type Rules = {
  version: string;
  budgets: Readonly<Record<Group, number>>;
  groupOrder: readonly Group[]; // lowest group first
  chooseFrom: "own_group_or_lower";
  electric: ElectricRules;
  familyTrack: FamilyTrackRules;
  waiver: WaiverRules;
  unusedBudget: "not_paid";
  netMethod: NetMethod;
};
