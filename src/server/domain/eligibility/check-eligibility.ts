import type { CarArrangement, EmployeeProfile } from "../model";
import { checkFamilyCar } from "./check-family-car";
import { checkRegularCar } from "./check-regular-car";
import { checkWaiver } from "./check-waiver";
import { isSameArrangement } from "./is-same-arrangement";
import { resolveEmployee, type EmployeeContext } from "./resolve-employee";
import type { EligibilityData, EligibilityResult, ReasonCode } from "./types";

function checkArrangement(
  arrangement: CarArrangement,
  profile: EmployeeProfile,
  employee: EmployeeContext,
  data: EligibilityData,
): EligibilityResult {
  if (arrangement.kind === "waiver") return checkWaiver(employee);

  // Only catalog cars can be chosen; a car found in the tax registry is allowed as "today", never as an alternative
  const { vehicle: ref } = arrangement;
  if (ref.kind === "tax_registry") return { status: "ineligible", reasons: ["NOT_IN_CATALOG"] };
  const vehicle = data.catalog.find((candidate) => candidate.id === ref.vehicleId);
  if (!vehicle) return { status: "ineligible", reasons: ["NOT_IN_CATALOG"] };

  return data.rules.familyTrack.cars.includes(vehicle.id)
    ? checkFamilyCar(vehicle, profile, employee, data)
    : checkRegularCar(vehicle, employee, data);
}

// Can this employee choose this arrangement? Decides "if", never "how much" (that is the net engine).
// Today's arrangement is not checked for eligibility; `current` only lets us note that the alternative is the same.
export function checkEligibility(
  profile: EmployeeProfile,
  arrangement: CarArrangement,
  data: EligibilityData,
  current?: CarArrangement,
): EligibilityResult {
  const note: ReasonCode[] = current && isSameArrangement(arrangement, current) ? ["SAME_AS_CURRENT"] : [];

  const employee = resolveEmployee(profile, data);
  if (!employee) return { status: "needs_data", reasons: note, missingFields: ["occupationId"] };

  const result = checkArrangement(arrangement, profile, employee, data);
  return { ...result, reasons: [...note, ...result.reasons] };
}
