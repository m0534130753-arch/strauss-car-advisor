import type { ReasonCode } from "@/server/domain/eligibility";
import { he, type ReasonContext } from "./he";

// The "סיבה" column of the comparison table. The electric bonus is left out here: the conclusion explains it.
export function describeReasons(reasons: readonly ReasonCode[], context: ReasonContext): string {
  return reasons
    .filter((code) => code !== "ELECTRIC_BONUS")
    .map((code) => he.reason[code](context))
    .join(he.reasonSeparator);
}
