import { z } from "zod";
import { GroupSchema, NonNegativeSchema } from "./shared";

// data/occupations.json, generated from the workbook by scripts/import-excel.ts
export const OccupationRowSchema = z.strictObject({
  id: z.string().regex(/^OCC-\d{2}$/),
  name: z.string().min(1),
  group: GroupSchema,
  carRequired: z.boolean(),
  waiverAllowed: z.boolean(),
  maintenanceAmount: NonNegativeSchema,
});

export const OccupationsFileSchema = z.array(OccupationRowSchema);

export type OccupationRow = z.infer<typeof OccupationRowSchema>;
