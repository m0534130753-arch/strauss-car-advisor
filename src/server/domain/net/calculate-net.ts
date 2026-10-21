import type { EmployeeProfile, NetMethod } from "../model";
import type { NetBreakdown, NetInputs } from "./types";

// Signature only; implemented in S1-T5.
export const calculateNet: (profile: EmployeeProfile, inputs: NetInputs, netMethod: NetMethod) => NetBreakdown = () => {
  throw new Error("calculateNet is not implemented yet (S1-T5)");
};
