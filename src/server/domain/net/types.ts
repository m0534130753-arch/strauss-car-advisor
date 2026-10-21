// Five prepared numbers: the engine never sees eligibility rules (ARCHITECTURE decision 6).
export type NetInputs = {
  usageValue: number;
  participation: number;
  maintenance: number;
  familyGapShare: number;
  electricGrossUp: number;
};

export type NetBreakdown = {
  grossCash: number;
  usageValue: number;
  electricGrossUp: number;
  maintenance: number;
  taxableIncome: number;
  taxBeforeCredits: number;
  creditPointsCredit: number;
  pensionCredit: number;
  incomeTax: number;
  nationalInsurance: number;
  health: number;
  pensionEmployee: number;
  studyFundEmployee: number;
  carParticipation: number;
  familyGapShare: number;
  net: number;
};
