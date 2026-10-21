import type { CarArrangement } from "@/server/domain/model";
import type { Figures } from "@/server/domain/comparison";
import type { EligibilityData, Entitlements } from "@/server/domain/eligibility";

// What the application layer will do later: turn an arrangement into prepared figures.
// Kept here, in test support, until that layer exists.

function vehicleOf(arrangement: CarArrangement, data: EligibilityData) {
  if (arrangement.kind !== "company_car" || arrangement.vehicle.kind !== "catalog") throw new Error("expected a catalog car");
  const { vehicleId } = arrangement.vehicle;
  const vehicle = data.catalog.find((candidate) => candidate.id === vehicleId);
  if (!vehicle) throw new Error(`unknown vehicle ${vehicleId}`);
  return vehicle;
}

// Today: the employee's own participation, and no family gap or entitlement checks.
export function todayFigures(current: CarArrangement, maintenanceAmount: number, data: EligibilityData): Figures {
  if (current.kind === "waiver") {
    return { kind: "waiver", usageValue: 0, participation: 0, maintenance: maintenanceAmount, familyGapShare: 0, electricBonus: false };
  }
  const vehicle = vehicleOf(current, data);
  return {
    kind: "car",
    usageValue: vehicle.catalogUsageValue,
    participation: current.participation?.value ?? 0,
    maintenance: 0,
    familyGapShare: 0,
    electricBonus: vehicle.propulsion === "electric",
  };
}

// An alternative: the catalog's default participation and the entitlements from the eligibility check.
export function alternativeFigures(arrangement: CarArrangement, entitlements: Entitlements, data: EligibilityData): Figures {
  if (arrangement.kind === "waiver") {
    return {
      kind: "waiver",
      usageValue: 0,
      participation: 0,
      maintenance: entitlements.maintenanceAmount,
      familyGapShare: 0,
      electricBonus: false,
    };
  }
  const vehicle = vehicleOf(arrangement, data);
  return {
    kind: "car",
    usageValue: vehicle.catalogUsageValue,
    participation: vehicle.defaultParticipation,
    maintenance: 0,
    familyGapShare: entitlements.familyGapEmployeeShare,
    electricBonus: entitlements.electricBonus,
  };
}
