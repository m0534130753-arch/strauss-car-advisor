import type { CarArrangement, EmployeeProfile } from "../model";
import { checkEligibility } from "./check-eligibility";
import type { EligibilityData, EligibleOption } from "./types";

// Every arrangement the employee can certainly choose: catalog cars in catalog order, then the waiver.
// Options that need more data are not listed; the conversation asks for the missing data first.
export function listEligibleOptions(
  profile: EmployeeProfile,
  data: EligibilityData,
  current?: CarArrangement,
): EligibleOption[] {
  const candidates: CarArrangement[] = [
    ...data.catalog.map((vehicle): CarArrangement => ({ kind: "company_car", vehicle: { kind: "catalog", vehicleId: vehicle.id } })),
    { kind: "waiver" },
  ];
  const options: EligibleOption[] = [];
  for (const arrangement of candidates) {
    const result = checkEligibility(profile, arrangement, data, current);
    if (result.status === "eligible") {
      options.push({ arrangement, reasons: result.reasons, entitlements: result.entitlements });
    }
  }
  return options;
}
