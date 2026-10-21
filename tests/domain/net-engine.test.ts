import { describe, expect, it } from "vitest";
import type { ElectricRules, EmployeeProfile, Field, NetMethod } from "@/server/domain/model";
import { calculateNet, grossUpElectric, type NetInputs } from "@/server/domain/net";
import { contribution } from "@/server/domain/net/contribution";
import { taxFromBrackets } from "@/server/domain/net/tax-brackets";
import { rules } from "../support/reference-data";

// Branch coverage of the engine pieces with small, hand-checkable numbers (the reference tests cover the real cases).

const field = (value: number, confirmed = true): Field<number> => ({ value, source: "demo", confirmed });

function profile(overrides: Partial<EmployeeProfile> = {}): EmployeeProfile {
  return {
    baseSalary: field(10000),
    commissions: field(0),
    bonus: field(0),
    pensionRate: field(0),
    studyFundRate: field(0),
    creditPoints: field(0),
    ...overrides,
  };
}

const noArrangement: NetInputs = { usageValue: 0, participation: 0, maintenance: 0, familyGapShare: 0, electricGrossUp: 0 };

describe("taxFromBrackets", () => {
  const brackets = [[1000, 0.1], [2000, 0.2], [null, 0.5]] as const;

  it("is zero for no income", () => {
    expect(taxFromBrackets(0, brackets)).toBe(0);
  });

  it("taxes only the part inside each bracket", () => {
    expect(taxFromBrackets(500, brackets)).toBeCloseTo(50, 9);
    expect(taxFromBrackets(1500, brackets)).toBeCloseTo(100 + 100, 9);
  });

  it("uses the open last bracket without a ceiling", () => {
    expect(taxFromBrackets(5000, brackets)).toBeCloseTo(100 + 200 + 3000 * 0.5, 9);
  });
});

describe("contribution", () => {
  const rule = { threshold: 1000, ceiling: 5000, lowRate: 0.01, highRate: 0.1 };

  it("uses the low rate up to the threshold", () => {
    expect(contribution(800, rule)).toBeCloseTo(8, 9);
  });

  it("uses the high rate above the threshold", () => {
    expect(contribution(3000, rule)).toBeCloseTo(10 + 200, 9);
  });

  it("charges nothing above the ceiling", () => {
    expect(contribution(9000, rule)).toBeCloseTo(10 + 400, 9);
  });
});

describe("calculateNet", () => {
  const method: NetMethod = {
    ...rules.netMethod,
    brackets: [[null, 0.2]],
    creditPointValue: 100,
    nationalInsurance: { threshold: 100000, ceiling: 100000, lowRate: 0, highRate: 0 },
    health: { threshold: 100000, ceiling: 100000, lowRate: 0, highRate: 0 },
  };

  it("sums gross cash from base, commissions and bonus", () => {
    const result = calculateNet(profile({ commissions: field(500), bonus: field(250) }), noArrangement, method);
    expect(result.grossCash).toBe(10750);
  });

  it("takes pension and study fund from cash pay only, as percents", () => {
    const result = calculateNet(
      profile({ pensionRate: field(6), studyFundRate: field(2.5) }),
      { ...noArrangement, usageValue: 3000, electricGrossUp: 400 },
      method,
    );
    expect(result.pensionEmployee).toBeCloseTo(600, 9);
    expect(result.studyFundEmployee).toBeCloseTo(250, 9);
  });

  it("adds usage value, maintenance and gross-up to the taxable income, but usage value never to the net", () => {
    const result = calculateNet(profile(), { ...noArrangement, usageValue: 3000, maintenance: 1500, electricGrossUp: 400 }, method);
    expect(result.taxableIncome).toBe(10000 + 3000 + 1500 + 400);
    // net = cash + maintenance + gross-up - income tax (no usage value in the net)
    expect(result.net).toBeCloseTo(10000 + 1500 + 400 - result.incomeTax, 9);
  });

  it("deducts participation and the family gap from the net only", () => {
    const base = calculateNet(profile(), noArrangement, method);
    const withDeductions = calculateNet(profile(), { ...noArrangement, participation: 300, familyGapShare: 1150 }, method);
    expect(withDeductions.net).toBeCloseTo(base.net - 1450, 9);
    expect(withDeductions.incomeTax).toBe(base.incomeTax);
  });

  it("credits points and 35% of the pension up to 7% of the credit income", () => {
    const result = calculateNet(profile({ pensionRate: field(6), creditPoints: field(2) }), noArrangement, method);
    expect(result.creditPointsCredit).toBe(200);
    expect(result.pensionCredit).toBeCloseTo(0.35 * 600, 9); // 600 is below the cap of 7% x 9,500 = 665
    const capped = calculateNet(profile({ baseSalary: field(20000), pensionRate: field(6) }), noArrangement, method);
    expect(capped.pensionCredit).toBeCloseTo(0.35 * 665, 9); // 1,200 is capped at 665
  });

  it("never lets income tax go below zero when credits exceed the tax", () => {
    const result = calculateNet(profile({ creditPoints: field(100) }), noArrangement, method);
    expect(result.incomeTax).toBe(0);
    expect(result.taxBeforeCredits).toBeCloseTo(2000, 9);
  });

  it("refuses a missing field", () => {
    expect(() => calculateNet(profile({ baseSalary: undefined }), noArrangement, method)).toThrow(/baseSalary/);
  });

  it("refuses an unconfirmed field", () => {
    expect(() => calculateNet(profile({ bonus: field(100, false) }), noArrangement, method)).toThrow(/bonus/);
  });
});

describe("grossUpElectric", () => {
  const { netMethod } = rules;
  const { netBonus } = rules.electric;
  const inputs: Omit<NetInputs, "electricGrossUp"> = { usageValue: 0, participation: 0, maintenance: 0, familyGapShare: 0 };

  it("returns the bonus itself for method gross", () => {
    const electric: ElectricRules = { netBonus: 250, method: "gross" };
    expect(grossUpElectric(profile(), inputs, netMethod, electric)).toBe(250);
  });

  it("returns more than the bonus for gross_up, and leaves exactly the bonus in the net", () => {
    const grossUp = grossUpElectric(profile(), inputs, netMethod, rules.electric);
    expect(grossUp).toBeGreaterThan(netBonus);
    const before = calculateNet(profile(), noArrangement, netMethod).net;
    const after = calculateNet(profile(), { ...noArrangement, electricGrossUp: grossUp }, netMethod).net;
    expect(Math.abs(after - before - netBonus)).toBeLessThan(1e-9);
  });

  it("fails when the bonus cannot be reached in the search range", () => {
    const confiscatory: NetMethod = { ...netMethod, brackets: [[null, 1]] };
    expect(() => grossUpElectric(profile(), inputs, confiscatory, rules.electric)).toThrow(/cannot reach/);
  });
});
