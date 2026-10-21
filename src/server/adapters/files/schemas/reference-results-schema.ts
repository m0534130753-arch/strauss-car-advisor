import { z } from "zod";
import { MoneySchema, NonNegativeSchema } from "./shared";

// data/reference-results.json: the workbook's expected results, used by tests only (never at runtime).
const ReferenceArrangementSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("company_car"), vehicleId: z.string() }),
  z.strictObject({ kind: z.literal("waiver"), maintenanceAmount: NonNegativeSchema }),
]);

export const ReferenceResultRowSchema = z.strictObject({
  employeeId: z.string().regex(/^E-\d{3}$/),
  today: ReferenceArrangementSchema,
  alternative: ReferenceArrangementSchema,
  eligible: z.boolean(),
  reason: z.string().min(1),
  netToday: MoneySchema,
  netAlternative: MoneySchema,
  difference: MoneySchema,
  taxToday: MoneySchema,
  taxAlternative: MoneySchema,
  socialToday: MoneySchema, // national insurance + health
  socialAlternative: MoneySchema,
  electricGrossRefund: NonNegativeSchema,
  familyEmployeeShare: NonNegativeSchema,
  conclusion: z.string().min(1),
});

export const ReferenceResultsFileSchema = z.array(ReferenceResultRowSchema);

export type ReferenceResultRow = z.infer<typeof ReferenceResultRowSchema>;
export type ReferenceArrangementRow = z.infer<typeof ReferenceArrangementSchema>;
