import type { EmployeeProfile, NetMethod } from "../model";
import { contribution } from "./contribution";
import { readProfileValues } from "./profile-values";
import { taxFromBrackets } from "./tax-brackets";
import type { NetBreakdown, NetInputs } from "./types";

// Monthly net for one arrangement (ARCHITECTURE decision 6). Pure, and no rounding at any step:
// rounding to the shekel is for display only, and a difference is computed before it.
export function calculateNet(profile: EmployeeProfile, inputs: NetInputs, netMethod: NetMethod): NetBreakdown {
  const values = readProfileValues(profile);
  const grossCash = values.baseSalary + values.commissions + values.bonus;

  // Pension and study fund are taken from cash pay only (not from usage value or the electric gross-up)
  const pensionEmployee = (grossCash * values.pensionRate) / 100;
  const studyFundEmployee = (grossCash * values.studyFundRate) / 100;

  const taxableIncome = grossCash + inputs.usageValue + inputs.maintenance + inputs.electricGrossUp;
  const taxBeforeCredits = taxFromBrackets(taxableIncome, netMethod.brackets);
  const creditPointsCredit = values.creditPoints * netMethod.creditPointValue;
  const { rate, maxContributionRate, incomeCeiling } = netMethod.pensionCredit;
  const pensionCredit = rate * Math.min(pensionEmployee, maxContributionRate * incomeCeiling);
  const incomeTax = Math.max(0, taxBeforeCredits - creditPointsCredit - pensionCredit);

  const nationalInsurance = contribution(taxableIncome, netMethod.nationalInsurance);
  const health = contribution(taxableIncome, netMethod.health);

  // Usage value is not in the net: it only raises the taxable income above
  const net =
    grossCash +
    inputs.maintenance +
    inputs.electricGrossUp -
    pensionEmployee -
    studyFundEmployee -
    incomeTax -
    nationalInsurance -
    health -
    inputs.participation -
    inputs.familyGapShare;

  return {
    grossCash,
    usageValue: inputs.usageValue,
    electricGrossUp: inputs.electricGrossUp,
    maintenance: inputs.maintenance,
    taxableIncome,
    taxBeforeCredits,
    creditPointsCredit,
    pensionCredit,
    incomeTax,
    nationalInsurance,
    health,
    pensionEmployee,
    studyFundEmployee,
    carParticipation: inputs.participation,
    familyGapShare: inputs.familyGapShare,
    net,
  };
}
