import type { EmployeeProfile, Field } from "../model";

export type ProfileValues = {
  baseSalary: number;
  commissions: number;
  bonus: number;
  pensionRate: number;
  studyFundRate: number;
  creditPoints: number;
};

// A missing or unconfirmed field never enters a calculation. The caller must check missing fields first
// (ARCHITECTURE decision 7), so reaching this error is a bug, not a business case.
function confirmedValue(field: Field<number> | undefined, name: string): number {
  if (field === undefined || !field.confirmed) {
    throw new Error(`calculateNet needs a confirmed value for "${name}"`);
  }
  return field.value;
}

export function readProfileValues(profile: EmployeeProfile): ProfileValues {
  return {
    baseSalary: confirmedValue(profile.baseSalary, "baseSalary"),
    commissions: confirmedValue(profile.commissions, "commissions"),
    bonus: confirmedValue(profile.bonus, "bonus"),
    pensionRate: confirmedValue(profile.pensionRate, "pensionRate"),
    studyFundRate: confirmedValue(profile.studyFundRate, "studyFundRate"),
    creditPoints: confirmedValue(profile.creditPoints, "creditPoints"),
  };
}
