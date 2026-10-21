import { z } from "zod";
import { CatalogGroupSchema, NonNegativeSchema, PropulsionSchema, RegistryCodeSchema } from "./shared";

// data/catalog.json, generated from the workbook by scripts/import-excel.ts (strict: we own this file).
// taxYear and vehicleTypeCode are not here: they are completed from the registry (ARCHITECTURE decision 15).
export const CatalogRowSchema = z.strictObject({
  id: z.string().regex(/^CAR-\d{2}$/),
  group: CatalogGroupSchema,
  manufacturerName: z.string().min(1),
  commercialName: z.string().min(1),
  modelDescription: z.string().min(1),
  key: z.strictObject({
    registrationYear: z.number().int(),
    manufacturerCode: RegistryCodeSchema,
    modelCode: RegistryCodeSchema,
  }),
  propulsion: PropulsionSchema,
  listPrice: NonNegativeSchema,
  catalogUsageValue: NonNegativeSchema,
  monthlyCost: NonNegativeSchema,
  defaultParticipation: NonNegativeSchema,
});

export const CatalogFileSchema = z.array(CatalogRowSchema);

export type CatalogRow = z.infer<typeof CatalogRowSchema>;
