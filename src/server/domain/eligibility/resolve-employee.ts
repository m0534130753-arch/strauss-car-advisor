import type { EmployeeProfile, Occupation } from "../model";
import { confirmedValue } from "./confirmed-value";
import type { EligibilityData } from "./types";

export type EmployeeContext = {
  occupation: Occupation;
  budget: number; // the budget of the employee's group
};

// The occupation decides the group, and the group decides the budget. Without a known occupation: undefined.
export function resolveEmployee(profile: EmployeeProfile, data: EligibilityData): EmployeeContext | undefined {
  const occupationId = confirmedValue(profile.occupationId);
  const occupation = data.occupations.find((candidate) => candidate.id === occupationId);
  if (!occupation) return undefined;
  return { occupation, budget: data.rules.budgets[occupation.group] };
}
