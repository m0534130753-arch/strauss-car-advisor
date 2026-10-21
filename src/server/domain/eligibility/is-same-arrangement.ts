import type { CarArrangement, RegistryKey } from "../model";

const sameKey = (a: RegistryKey, b: RegistryKey): boolean =>
  a.taxYear === b.taxYear &&
  a.registrationYear === b.registrationYear &&
  a.vehicleTypeCode === b.vehicleTypeCode &&
  a.manufacturerCode === b.manufacturerCode &&
  a.modelCode === b.modelCode;

// Is the alternative exactly today's arrangement? Catalog cars by id, registry cars by the full five-field key.
export function isSameArrangement(a: CarArrangement, b: CarArrangement): boolean {
  if (a.kind === "waiver" || b.kind === "waiver") return a.kind === b.kind;
  if (a.vehicle.kind === "catalog" && b.vehicle.kind === "catalog") return a.vehicle.vehicleId === b.vehicle.vehicleId;
  if (a.vehicle.kind === "tax_registry" && b.vehicle.kind === "tax_registry") return sameKey(a.vehicle.key, b.vehicle.key);
  return false;
}
