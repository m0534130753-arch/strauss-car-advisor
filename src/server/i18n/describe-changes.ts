import type { Change } from "@/server/domain/comparison";
import { he } from "./he";

function describeChange(change: Change): string {
  switch (change.kind) {
    case "usage_value":
      return he.change.usageValue(change.from, change.to);
    case "car_to_waiver":
      return he.change.carToWaiver(change.usageValueRemoved, change.maintenanceAdded);
    case "waiver_to_car":
      return he.change.waiverToCar(change.usageValueAdded, change.maintenanceRemoved);
    case "electric_bonus_added":
      return he.change.electricAdded(change.netBonus, change.method);
    case "electric_bonus_removed":
      return he.change.electricRemoved(change.netBonus, change.method);
    case "participation":
      return he.change.participation(change.from, change.to);
    case "family_gap":
      return he.change.familyGap(change.from, change.to);
  }
}

// The "למה" column of the comparison table: the changes in one line, in the sheet's format.
export function describeChanges(changes: readonly Change[]): string {
  return changes.map(describeChange).join(he.separator);
}
