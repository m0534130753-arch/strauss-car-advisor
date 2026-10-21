import type { Vehicle } from "../model";
import { hasElectricBonus } from "./has-electric-bonus";
import type { EmployeeContext } from "./resolve-employee";
import type { EligibilityData, EligibilityResult, ReasonCode } from "./types";

// A catalog car outside the family track: from the employee's group or lower, and within the budget.
export function checkRegularCar(vehicle: Vehicle, employee: EmployeeContext, data: EligibilityData): EligibilityResult {
  const { groupOrder } = data.rules;
  const vehicleRank = groupOrder.indexOf(vehicle.group as (typeof groupOrder)[number]);
  const employeeRank = groupOrder.indexOf(employee.occupation.group);

  // A family-group car that is not on the family track has no rank, so it is never a regular choice
  const tooHigh = vehicleRank < 0 || vehicleRank > employeeRank;
  const tooExpensive = vehicle.monthlyCost > employee.budget;

  const problems: ReasonCode[] = [];
  if (tooHigh) problems.push("GROUP_TOO_HIGH");
  if (tooExpensive) problems.push("COST_EXCEEDS_BUDGET");
  if (problems.length > 0) return { status: "ineligible", reasons: problems };

  const electricBonus = hasElectricBonus(vehicle);
  return {
    status: "eligible",
    reasons: electricBonus ? ["OWN_OR_LOWER_GROUP", "ELECTRIC_BONUS"] : ["OWN_OR_LOWER_GROUP"],
    entitlements: { budget: employee.budget, electricBonus, familyGapEmployeeShare: 0, maintenanceAmount: 0 },
  };
}
