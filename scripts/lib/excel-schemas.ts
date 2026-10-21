import { z } from "zod";

// Schemas for the JSON files generated from the Excel workbook (ARCHITECTURE decisions 4 and 15).
// Interim home: the permanent loader and schemas arrive in S1-T4 (src/server/adapters/files).

export const GroupSchema = z.enum(["א", "ב", "ג", "ד"]);
export const CatalogGroupSchema = z.enum(["א", "ב", "ג", "ד", "משפחתי"]);
export const PropulsionSchema = z.enum(["petrol", "hybrid", "plugin", "electric"]);

const Money = z.number().finite();
const NonNegative = z.number().finite().nonnegative();
const RegistryCode = z.string().regex(/^\d{5}$/);

export const VehicleSchema = z.strictObject({
  id: z.string().regex(/^CAR-\d{2}$/),
  group: CatalogGroupSchema,
  manufacturerName: z.string().min(1),
  commercialName: z.string().min(1),
  modelDescription: z.string().min(1),
  // taxYear and vehicleTypeCode are completed from the tax registry (S2-T5)
  key: z.strictObject({
    registrationYear: z.number().int(),
    manufacturerCode: RegistryCode,
    modelCode: RegistryCode,
  }),
  propulsion: PropulsionSchema,
  listPrice: NonNegative,
  catalogUsageValue: NonNegative,
  monthlyCost: NonNegative,
  defaultParticipation: NonNegative,
});

export const OccupationSchema = z.strictObject({
  id: z.string().regex(/^OCC-\d{2}$/),
  name: z.string().min(1),
  group: GroupSchema,
  carRequired: z.boolean(),
  waiverAllowed: z.boolean(),
  maintenanceAmount: NonNegative,
});

export const EmployeeSchema = z.strictObject({
  id: z.string().regex(/^E-\d{3}$/),
  name: z.string().min(1),
  occupationId: z.string().regex(/^OCC-\d{2}$/),
  profile: z.strictObject({
    baseSalary: NonNegative,
    commissions: NonNegative,
    bonus: NonNegative,
    pensionRate: NonNegative,
    studyFundRate: NonNegative,
    creditPoints: NonNegative,
    childrenUnder23: z.number().int().nonnegative(),
  }),
  currentArrangement: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("company_car"), vehicleId: z.string(), participation: NonNegative }),
    z.strictObject({ kind: z.literal("waiver") }),
  ]),
  question: z.string().min(1),
});

const ReferenceArrangementSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("company_car"), vehicleId: z.string() }),
  z.strictObject({ kind: z.literal("waiver"), maintenanceAmount: NonNegative }),
]);

export const ReferenceResultSchema = z.strictObject({
  employeeId: z.string().regex(/^E-\d{3}$/),
  today: ReferenceArrangementSchema,
  alternative: ReferenceArrangementSchema,
  eligible: z.boolean(),
  reason: z.string().min(1),
  netToday: Money,
  netAlternative: Money,
  difference: Money,
  taxToday: Money,
  taxAlternative: Money,
  socialToday: Money, // national insurance + health
  socialAlternative: Money,
  electricGrossRefund: NonNegative,
  familyEmployeeShare: NonNegative,
  conclusion: z.string().min(1),
});

export type Vehicle = z.infer<typeof VehicleSchema>;
export type Occupation = z.infer<typeof OccupationSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type ReferenceResult = z.infer<typeof ReferenceResultSchema>;
export type ReferenceArrangement = z.infer<typeof ReferenceArrangementSchema>;

export type Datasets = {
  catalog: Vehicle[];
  occupations: Occupation[];
  employees: Employee[];
  reference: ReferenceResult[];
};
