import type { Rules } from "@/server/domain/model";
import { RULES_FILE } from "./file-names";
import { parseFile } from "./reference-data-error";
import { RulesFileSchema } from "./schemas";

// Validates data/strauss-rules.json and keeps only what the business logic reads (no notes).
export function convertRules(raw: unknown): Rules {
  const file = parseFile(RULES_FILE, RulesFileSchema, raw);
  return {
    version: file.version,
    budgets: file.budgets,
    groupOrder: file.groupOrder,
    chooseFrom: file.chooseFrom,
    electric: file.electric,
    familyTrack: {
      minChildren: file.familyTrack.minChildren,
      childMaxAge: file.familyTrack.childMaxAge,
      cars: file.familyTrack.cars,
      gapSplitEmployee: file.familyTrack.gapSplitEmployee,
    },
    waiver: {
      maintenanceIsTaxable: file.waiver.maintenanceIsTaxable,
      maintenanceIsPensionable: file.waiver.maintenanceIsPensionable,
    },
    unusedBudget: file.unusedBudget,
    netMethod: {
      basis: file.netMethod.basis,
      taxYear: file.netMethod.taxYear,
      creditPointValue: file.netMethod.creditPointValue,
      brackets: file.netMethod.brackets,
      nationalInsurance: file.netMethod.nationalInsurance,
      health: file.netMethod.health,
      pensionCredit: file.netMethod.pensionCredit,
      contributionsBase: file.netMethod.contributionsBase,
      participation: file.netMethod.participation,
      rounding: file.netMethod.rounding,
    },
  };
}
