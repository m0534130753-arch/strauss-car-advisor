import { z } from "zod";
import { GroupSchema, PositiveSchema, RateSchema } from "./shared";

// Schema of data/strauss-rules.json. The pilot replaces that file, so these objects are not strict:
// extra descriptive fields are allowed, but every field the logic reads must be present and valid.

// Brackets are [upper limit, rate]: limits ascend, and only the last bracket has no ceiling (null).
function bracketsAreValid(brackets: ReadonlyArray<readonly [number | null, number]>): boolean {
  return brackets.every(([limit], index) => {
    if (index === brackets.length - 1) return limit === null;
    const next = brackets[index + 1][0];
    return limit !== null && (next === null || limit < next);
  });
}

const BracketsSchema = z
  .array(z.tuple([PositiveSchema.nullable(), RateSchema]))
  .min(1)
  .refine(bracketsAreValid, { message: "limits must ascend and only the last bracket may have no limit (null)" });

const ContributionRuleSchema = z
  .object({ threshold: PositiveSchema, ceiling: PositiveSchema, lowRate: RateSchema, highRate: RateSchema })
  .refine((rule) => rule.threshold <= rule.ceiling, { message: "threshold must not exceed the ceiling" });

const NetMethodSchema = z.object({
  basis: z.literal("monthly"),
  taxYear: z.number().int(),
  creditPointValue: PositiveSchema,
  brackets: BracketsSchema,
  nationalInsurance: ContributionRuleSchema,
  health: ContributionRuleSchema,
  pensionCredit: z.object({ rate: RateSchema, maxContributionRate: RateSchema, incomeCeiling: PositiveSchema }),
  contributionsBase: z.literal("gross"),
  // The engine supports only these treatments, so any other value is rejected here
  participation: z.object({ treatment: z.literal("net_deduction"), reducesValueOfUse: z.literal(false) }),
  rounding: z.object({ during: z.literal("none"), display: z.literal("shekel") }),
});

export const RulesFileSchema = z.object({
  version: z.string().min(1),
  budgets: z.object({ "א": PositiveSchema, "ב": PositiveSchema, "ג": PositiveSchema, "ד": PositiveSchema }),
  groupOrder: z
    .array(GroupSchema)
    .length(4)
    .refine((groups) => new Set(groups).size === groups.length, { message: "groups must not repeat" }),
  chooseFrom: z.literal("own_group_or_lower"),
  electric: z.object({ netBonus: PositiveSchema, method: z.enum(["gross_up", "gross"]) }),
  familyTrack: z.object({
    minChildren: z.number().int().positive(),
    childMaxAge: z.number().int().positive(),
    cars: z.array(z.string().min(1)).min(1),
    priceSource: z.literal("catalogue"),
    gapSplitEmployee: RateSchema,
  }),
  waiver: z.object({
    allowedBy: z.literal("occupation"),
    maintenanceIsTaxable: z.boolean(),
    maintenanceIsPensionable: z.boolean(),
  }),
  unusedBudget: z.literal("not_paid"),
  netMethod: NetMethodSchema,
  valueOfUse: z.object({
    source: z.string().min(1),
    key: z.array(z.string().min(1)).length(5),
    // 0 petrol, 1 hybrid, 2 plugin, 3 electric: the registry column that holds the propulsion type
    driveField: z.object({ "0": z.string().min(1), "1": z.string().min(1), "2": z.string().min(1), "3": z.string().min(1) }),
  }),
});
