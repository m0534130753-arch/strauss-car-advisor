import type { EmployeeProfile, Vehicle } from "../model";
import { confirmedValue } from "./confirmed-value";
import { hasElectricBonus } from "./has-electric-bonus";
import type { EmployeeContext } from "./resolve-employee";
import type { EligibilityData, EligibilityResult } from "./types";

// A family-track car: needs enough children. A required car does not block this track.
// The employee pays part of the gap above his group's budget (David: (6,000 - 3,700) / 2 = 1,150).
export function checkFamilyCar(
  vehicle: Vehicle,
  profile: EmployeeProfile,
  employee: EmployeeContext,
  data: EligibilityData,
): EligibilityResult {
  const { minChildren, gapSplitEmployee } = data.rules.familyTrack;
  const children = confirmedValue(profile.childrenUnder23);
  if (children === undefined) return { status: "needs_data", reasons: [], missingFields: ["childrenUnder23"] };
  if (children < minChildren) return { status: "ineligible", reasons: ["FAMILY_TRACK_NOT_ENOUGH_CHILDREN"] };

  const electricBonus = hasElectricBonus(vehicle);
  return {
    status: "eligible",
    reasons: electricBonus ? ["FAMILY_TRACK", "ELECTRIC_BONUS"] : ["FAMILY_TRACK"],
    entitlements: {
      budget: employee.budget,
      electricBonus,
      familyGapEmployeeShare: Math.max(0, vehicle.monthlyCost - employee.budget) * gapSplitEmployee,
      maintenanceAmount: 0,
    },
  };
}
