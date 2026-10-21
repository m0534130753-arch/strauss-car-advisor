import type { ElectricRules } from "../model";

// What one arrangement costs and pays the employee each month, as prepared numbers (like the net engine's inputs).
// The application layer builds it from the arrangement, the registry and the eligibility entitlements.
export type Figures = {
  kind: "car" | "waiver";
  usageValue: number;
  participation: number;
  maintenance: number;
  familyGapShare: number;
  electricBonus: boolean;
};

// A change between today and an alternative, without any wording: server/i18n turns it into Hebrew.
export type Change =
  | { kind: "usage_value"; from: number; to: number }
  | { kind: "car_to_waiver"; usageValueRemoved: number; maintenanceAdded: number }
  | { kind: "waiver_to_car"; usageValueAdded: number; maintenanceRemoved: number }
  | { kind: "electric_bonus_added"; netBonus: number; method: ElectricRules["method"] }
  | { kind: "electric_bonus_removed"; netBonus: number; method: ElectricRules["method"] }
  | { kind: "participation"; from: number; to: number }
  | { kind: "family_gap"; from: number; to: number };
