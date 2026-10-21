import type { CatalogGroup, Propulsion } from "./group";

// Codes are strings ('00885'): leading zeros matter. Lookups always use the full five-field key.
export type RegistryKey = {
  taxYear: number;
  registrationYear: number;
  vehicleTypeCode: string; // '1' for catalog cars
  manufacturerCode: string;
  modelCode: string;
};

export type Vehicle = {
  id: string; // 'CAR-10'
  group: CatalogGroup; // the family track is derived from rules.familyTrack.cars
  manufacturerName: string;
  commercialName: string; // 'ATTO 3'
  modelDescription: string; // 'SC2E-SC2E01'
  key: RegistryKey;
  propulsion: Propulsion;
  listPrice: number;
  catalogUsageValue: number; // for checks only; at runtime the registry decides
  monthlyCost: number;
  defaultParticipation: number;
};
