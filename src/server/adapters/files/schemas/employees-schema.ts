import { z } from "zod";
import { NonNegativeSchema } from "./shared";

// data/sample-employees.json, generated from the workbook by scripts/import-excel.ts. No ID numbers, ever.
export const EmployeeRowSchema = z.strictObject({
  id: z.string().regex(/^E-\d{3}$/),
  name: z.string().min(1),
  occupationId: z.string().regex(/^OCC-\d{2}$/),
  profile: z.strictObject({
    baseSalary: NonNegativeSchema,
    commissions: NonNegativeSchema,
    bonus: NonNegativeSchema,
    pensionRate: NonNegativeSchema,
    studyFundRate: NonNegativeSchema,
    creditPoints: NonNegativeSchema,
    childrenUnder23: z.number().int().nonnegative(),
  }),
  currentArrangement: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("company_car"), vehicleId: z.string(), participation: NonNegativeSchema }),
    z.strictObject({ kind: z.literal("waiver") }),
  ]),
  question: z.string().min(1),
});

export const EmployeesFileSchema = z.array(EmployeeRowSchema);

export type EmployeeRow = z.infer<typeof EmployeeRowSchema>;
