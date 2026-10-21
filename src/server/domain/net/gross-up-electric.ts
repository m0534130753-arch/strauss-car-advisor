import type { ElectricRules, EmployeeProfile, NetMethod } from "../model";
import type { NetInputs } from "./types";

// Gross amount that leaves the employee with exactly electric.netBonus more net. Signature only; implemented in S1-T5.
export const grossUpElectric: (
  profile: EmployeeProfile,
  inputs: Omit<NetInputs, "electricGrossUp">,
  netMethod: NetMethod,
  electric: ElectricRules,
) => number = () => {
  throw new Error("grossUpElectric is not implemented yet (S1-T5)");
};
