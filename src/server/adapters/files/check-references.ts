import type { ReferenceData } from "@/server/ports/reference-data-source";
import { EMPLOYEES_FILE, RULES_FILE } from "./file-names";
import { ReferenceDataError } from "./reference-data-error";

// Cross-file checks: every id that one file mentions must exist in the file that owns it.
export function checkReferences(data: ReferenceData): void {
  const vehicles = new Map(data.catalog.map((vehicle) => [vehicle.id, vehicle]));
  const occupationIds = new Set(data.occupations.map((occupation) => occupation.id));

  for (const carId of data.rules.familyTrack.cars) {
    const vehicle = vehicles.get(carId);
    if (!vehicle) throw new ReferenceDataError(RULES_FILE, `familyTrack.cars: "${carId}" is not in the catalog`);
    if (vehicle.group !== "משפחתי") {
      throw new ReferenceDataError(RULES_FILE, `familyTrack.cars: "${carId}" is not in the family group`);
    }
  }

  for (const employee of data.sampleEmployees) {
    const occupationId = employee.profile.occupationId?.value;
    if (occupationId === undefined || !occupationIds.has(occupationId)) {
      throw new ReferenceDataError(EMPLOYEES_FILE, `${employee.id}: occupationId "${occupationId}" is not in the occupations`);
    }
    const arrangement = employee.currentArrangement;
    if (arrangement.kind === "company_car" && arrangement.vehicle.kind === "catalog") {
      if (!vehicles.has(arrangement.vehicle.vehicleId)) {
        throw new ReferenceDataError(
          EMPLOYEES_FILE,
          `${employee.id}: currentArrangement.vehicleId "${arrangement.vehicle.vehicleId}" is not in the catalog`,
        );
      }
    }
  }
}
