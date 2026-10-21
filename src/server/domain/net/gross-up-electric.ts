import type { ElectricRules, EmployeeProfile, NetMethod } from "../model";
import { calculateNet } from "./calculate-net";
import type { NetInputs } from "./types";

const SEARCH_ITERATIONS = 100;
const SEARCH_CEILING_MULTIPLE = 3;

// The gross amount that leaves the employee with exactly electric.netBonus more net (not pensionable).
// method "gross": the amount is the bonus itself. method "gross_up": binary search on [0, 3 x bonus].
export function grossUpElectric(
  profile: EmployeeProfile,
  inputs: Omit<NetInputs, "electricGrossUp">,
  netMethod: NetMethod,
  electric: ElectricRules,
): number {
  if (electric.method === "gross") return electric.netBonus;

  const netWith = (grossUp: number): number => calculateNet(profile, { ...inputs, electricGrossUp: grossUp }, netMethod).net;
  const baseNet = netWith(0);
  const netGainOf = (grossUp: number): number => netWith(grossUp) - baseNet;

  let low = 0;
  let high = electric.netBonus * SEARCH_CEILING_MULTIPLE;
  if (netGainOf(high) < electric.netBonus) {
    throw new Error("electric gross-up cannot reach the net bonus within the search range");
  }
  for (let step = 0; step < SEARCH_ITERATIONS; step++) {
    const middle = (low + high) / 2;
    if (netGainOf(middle) < electric.netBonus) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
