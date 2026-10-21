import type { EmployeeContext } from "./resolve-employee";
import type { EligibilityResult, ReasonCode } from "./types";

// Giving up the car for a maintenance amount: the occupation decides if it is allowed, and how much.
export function checkWaiver(employee: EmployeeContext): EligibilityResult {
  const { carRequired, waiverAllowed, maintenanceAmount } = employee.occupation;
  const problems: ReasonCode[] = [];
  if (carRequired) problems.push("WAIVER_BLOCKED_CAR_REQUIRED");
  if (!waiverAllowed) problems.push("WAIVER_NOT_ALLOWED");
  if (problems.length > 0) return { status: "ineligible", reasons: problems };

  return {
    status: "eligible",
    reasons: ["WAIVER_ALLOWED"],
    entitlements: { budget: employee.budget, electricBonus: false, familyGapEmployeeShare: 0, maintenanceAmount },
  };
}
