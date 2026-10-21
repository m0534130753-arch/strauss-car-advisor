import type { CarArrangement, EmployeeProfile, Occupation, Rules, Vehicle } from "../model";

// Codes only: the Hebrew text lives in server/i18n/he.ts, never in the domain.
export type ReasonCode =
  | "SAME_AS_CURRENT" // a note: the alternative is today's arrangement
  | "NOT_IN_CATALOG"
  | "GROUP_TOO_HIGH"
  | "COST_EXCEEDS_BUDGET"
  | "OWN_OR_LOWER_GROUP"
  | "ELECTRIC_BONUS"
  | "FAMILY_TRACK"
  | "FAMILY_TRACK_NOT_ENOUGH_CHILDREN"
  | "WAIVER_BLOCKED_CAR_REQUIRED"
  | "WAIVER_NOT_ALLOWED"
  | "WAIVER_ALLOWED";

export type Entitlements = {
  budget: number; // the budget of the employee's group
  electricBonus: boolean;
  familyGapEmployeeShare: number;
  maintenanceAmount: number;
};

// Entitlements exist only for an eligible result: no invented numbers for "no" or "unknown".
export type EligibilityResult =
  | { status: "eligible"; reasons: ReasonCode[]; entitlements: Entitlements }
  | { status: "ineligible"; reasons: ReasonCode[] }
  | { status: "needs_data"; reasons: ReasonCode[]; missingFields: (keyof EmployeeProfile)[] };

export type EligibilityStatus = EligibilityResult["status"];

export type EligibilityData = {
  catalog: readonly Vehicle[];
  occupations: readonly Occupation[];
  rules: Rules;
};

export type EligibleOption = {
  arrangement: CarArrangement;
  reasons: ReasonCode[];
  entitlements: Entitlements;
};
