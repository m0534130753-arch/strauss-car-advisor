import type { Field } from "./employee";
import type { RegistryKey } from "./vehicle";

export type VehicleRef =
  | { kind: "catalog"; vehicleId: string }
  | { kind: "tax_registry"; key: RegistryKey; usageValue: number; label: string };

// Today's arrangement and every alternative use the same type.
export type CarArrangement =
  | { kind: "company_car"; vehicle: VehicleRef; participation?: Field<number> }
  | { kind: "waiver" }; // the maintenance amount comes from the occupation

export type Alternative = {
  id: string;
  arrangement: CarArrangement;
  hidden: boolean;
  createdAt: string;
};
