import type { Vehicle } from "../model";

// The electric bonus is for electric cars only, not for plug-in hybrids (ARCHITECTURE decision 7).
export function hasElectricBonus(vehicle: Vehicle): boolean {
  return vehicle.propulsion === "electric";
}
