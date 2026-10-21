import { describe, expect, it } from "vitest";
import { calculateNet, grossUpElectric, type NetInputs } from "@/server/domain/net";
import { buildReferenceCases, rules, type ReferenceCase } from "../support/reference-data";

// Reference tests: the engine must reproduce the Strauss workbook for all six sample employees (ARCHITECTURE section 12).
// Written before the engine (S1-T2). The suite stays skipped, so CI stays green, until S1-T5 turns it on:
// RUN_ENGINE_TESTS=1 npx vitest run tests/domain/reference.test.ts
// S1-T5 replaces `referenceSuite` with a plain `describe`.
const referenceSuite = process.env.RUN_ENGINE_TESTS === "1" ? describe : describe.skip;

const TOLERANCE = 0.5; // the sheet shows whole shekels

function expectNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

// electric.netBonus is what the employee should see; the gross-up is what the employer reports.
function withGrossUp(testCase: ReferenceCase, side: "today" | "alternative"): NetInputs {
  const inputs = side === "today" ? testCase.todayInputs : testCase.alternativeInputs;
  const isElectric = side === "today" ? testCase.todayIsElectric : testCase.alternativeIsElectric;
  const electricGrossUp = isElectric ? grossUpElectric(testCase.profile, inputs, rules.netMethod, rules.electric) : 0;
  return { ...inputs, electricGrossUp };
}

const cases = buildReferenceCases();

describe("reference data", () => {
  it("covers six employees and each one resolves to catalog, occupation and inputs", () => {
    expect(cases).toHaveLength(6);
    for (const testCase of cases) {
      expect(testCase.alternativeInputs.usageValue + testCase.alternativeInputs.maintenance).toBeGreaterThan(0);
    }
  });
});

referenceSuite.each(cases.map((testCase) => [testCase.row.employeeId, testCase] as const))(
  "reference employee %s",
  (_id, testCase) => {
    const { row, profile } = testCase;

    it("today: net, tax and national insurance + health match the sheet", () => {
      const result = calculateNet(profile, withGrossUp(testCase, "today"), rules.netMethod);
      expectNear(result.net, row.netToday);
      expectNear(result.incomeTax, row.taxToday);
      expectNear(result.nationalInsurance + result.health, row.socialToday);
    });

    it("alternative: net, tax and national insurance + health match the sheet", () => {
      const result = calculateNet(profile, withGrossUp(testCase, "alternative"), rules.netMethod);
      expectNear(result.net, row.netAlternative);
      expectNear(result.incomeTax, row.taxAlternative);
      expectNear(result.nationalInsurance + result.health, row.socialAlternative);
    });

    it("the difference is computed before rounding and matches the sheet", () => {
      const today = calculateNet(profile, withGrossUp(testCase, "today"), rules.netMethod);
      const alternative = calculateNet(profile, withGrossUp(testCase, "alternative"), rules.netMethod);
      expectNear(alternative.net - today.net, row.difference);
    });

    it("electric gross-up matches the sheet, and leaves exactly the net bonus", () => {
      if (!testCase.alternativeIsElectric) {
        expect(row.electricGrossRefund).toBe(0);
        return;
      }
      const base = { ...testCase.alternativeInputs, electricGrossUp: 0 };
      const grossUp = grossUpElectric(profile, testCase.alternativeInputs, rules.netMethod, rules.electric);
      expectNear(grossUp, row.electricGrossRefund);
      const withBonus = calculateNet(profile, { ...base, electricGrossUp: grossUp }, rules.netMethod).net;
      const withoutBonus = calculateNet(profile, base, rules.netMethod).net;
      expect(Math.abs(withBonus - withoutBonus - rules.electric.netBonus)).toBeLessThan(1e-6);
    });
  },
);

referenceSuite("family track", () => {
  it("David (E-002): the employee's half of the gap above the group budget is 1,150 and the net is 5,078", () => {
    const testCase = cases.find((candidate) => candidate.row.employeeId === "E-002");
    if (!testCase) throw new Error("E-002 is missing from the reference data");
    expect(testCase.alternativeInputs.familyGapShare).toBe(1150);
    const result = calculateNet(testCase.profile, withGrossUp(testCase, "alternative"), rules.netMethod);
    expect(result.familyGapShare).toBe(1150);
    expectNear(result.net, testCase.row.netAlternative);
  });
});
