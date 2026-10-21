import type { CatalogGroup, Propulsion } from "./group";

// What the catalog knows about a car. Codes are strings ('00885'): leading zeros matter.
export type CatalogRegistryKey = {
  registrationYear: number;
  manufacturerCode: string;
  modelCode: string;
};

// The full five-field key for a registry lookup. The application layer completes the catalog key with the
// tax year (from the registry) and the vehicle type code ('1' for catalog cars). Never look up by a partial key.
export type RegistryKey = CatalogRegistryKey & {
  taxYear: number;
  vehicleTypeCode: string;
};

export type Vehicle = {
  id: string; // 'CAR-10'
  group: CatalogGroup; // the family track is derived from rules.familyTrack.cars
  manufacturerName: string;
  commercialName: string; // 'ATTO 3'
  modelDescription: string; // 'SC2E-SC2E01'
  key: CatalogRegistryKey;
  propulsion: Propulsion;
  listPrice: number;
  catalogUsageValue: number; // for checks only; at runtime the registry decides
  monthlyCost: number;
  defaultParticipation: number;
};
