import type { ElectricRules } from "../model";
import type { Change, Figures } from "./types";

function vehicleChanges(today: Figures, alternative: Figures): Change[] {
  if (today.kind === "car" && alternative.kind === "car") {
    return today.usageValue === alternative.usageValue
      ? []
      : [{ kind: "usage_value", from: today.usageValue, to: alternative.usageValue }];
  }
  if (today.kind === "car") {
    return [{ kind: "car_to_waiver", usageValueRemoved: today.usageValue, maintenanceAdded: alternative.maintenance }];
  }
  if (alternative.kind === "car") {
    return [{ kind: "waiver_to_car", usageValueAdded: alternative.usageValue, maintenanceRemoved: today.maintenance }];
  }
  return []; // two waivers of the same occupation: nothing changes
}

function electricChanges(today: Figures, alternative: Figures, electric: ElectricRules): Change[] {
  const { netBonus, method } = electric;
  if (alternative.electricBonus && !today.electricBonus) return [{ kind: "electric_bonus_added", netBonus, method }];
  if (today.electricBonus && !alternative.electricBonus) return [{ kind: "electric_bonus_removed", netBonus, method }];
  return [];
}

function participationChanges(today: Figures, alternative: Figures): Change[] {
  return today.participation === alternative.participation
    ? []
    : [{ kind: "participation", from: today.participation, to: alternative.participation }];
}

function familyGapChanges(today: Figures, alternative: Figures): Change[] {
  return today.familyGapShare === alternative.familyGapShare
    ? []
    : [{ kind: "family_gap", from: today.familyGapShare, to: alternative.familyGapShare }];
}

// What changes between today and an alternative, in the order of the sheet's "למה" column:
// usage value or maintenance, electric bonus, participation, family gap. An unchanged item is left out.
export function buildChanges(today: Figures, alternative: Figures, electric: ElectricRules): Change[] {
  return [
    ...vehicleChanges(today, alternative),
    ...electricChanges(today, alternative, electric),
    ...participationChanges(today, alternative),
    ...familyGapChanges(today, alternative),
  ];
}
