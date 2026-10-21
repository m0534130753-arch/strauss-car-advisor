import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import type { ElectricRules, EmployeeProfile, Field } from "@/server/domain/model";
import { calculateNet, grossUpElectric, type NetInputs } from "@/server/domain/net";
import { FilesReferenceDataSource } from "@/server/adapters/files/files-reference-data-source";
import { rules } from "../support/reference-data";

// Edge cases of the net engine, checked against hand calculations written out in each test.
// The real Strauss rules are used: tax brackets 10/14/20/31/35/47/50%, national insurance and health
// 1.04% / 3.23% up to 7,522 and 7% / 5.17% above it (up to 50,695), credit point 242, pension credit 232.75.

const { netMethod } = rules;
const NO_ARRANGEMENT: NetInputs = { usageValue: 0, participation: 0, maintenance: 0, familyGapShare: 0, electricGrossUp: 0 };
const WITHOUT_GROSS_UP = { usageValue: 0, participation: 0, maintenance: 0, familyGapShare: 0 };

// Above 7,522 the employee also pays 7% national insurance and 5.17% health on every extra shekel
const MARGINAL_CONTRIBUTIONS = 0.07 + 0.0517;

const field = (value: number): Field<number> => ({ value, source: "demo", confirmed: true });

function profile(
  baseSalary: number,
  extra: { pensionRate?: number; creditPoints?: number } = {},
): EmployeeProfile {
  return {
    baseSalary: field(baseSalary),
    commissions: field(0),
    bonus: field(0),
    pensionRate: field(extra.pensionRate ?? 0),
    studyFundRate: field(0),
    creditPoints: field(extra.creditPoints ?? 0),
  };
}

const near = (actual: number, expected: number, tolerance = 0.5) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

describe("Noa's additional values (ARCHITECTURE section 12, computed with the same method, not from the sheet)", () => {
  let noa: EmployeeProfile;
  let usageOf: (vehicleId: string) => { usageValue: number; participation: number; electric: boolean };

  beforeAll(async () => {
    const data = await new FilesReferenceDataSource(path.join(__dirname, "..", "..", "data")).load();
    const employee = data.sampleEmployees.find((candidate) => candidate.id === "E-001");
    if (!employee) throw new Error("E-001 is missing");
    noa = employee.profile;
    usageOf = (vehicleId) => {
      const vehicle = data.catalog.find((candidate) => candidate.id === vehicleId);
      if (!vehicle) throw new Error(`unknown vehicle ${vehicleId}`);
      return { usageValue: vehicle.catalogUsageValue, participation: vehicle.defaultParticipation, electric: vehicle.propulsion === "electric" };
    };
  });

  const netWithCar = (vehicleId: string, participation?: number): number => {
    const car = usageOf(vehicleId);
    const inputs = { ...WITHOUT_GROSS_UP, usageValue: car.usageValue, participation: participation ?? car.participation };
    const grossUp = car.electric ? grossUpElectric(noa, inputs, netMethod, rules.electric) : 0;
    return calculateNet(noa, { ...inputs, electricGrossUp: grossUp }, netMethod).net;
  };

  const today = () => netWithCar("CAR-09", 300); // COROLLA CROSS, Noa's own participation

  it("EV3: 11,779 net, 747 more than today", () => {
    const net = netWithCar("CAR-11");
    near(net, 11779);
    near(net - today(), 747);
  });

  it("a waiver of 2,000: 14,231 net, 3,199 more than today", () => {
    const net = calculateNet(noa, { ...NO_ARRANGEMENT, maintenance: 2000 }, netMethod).net;
    near(net, 14231);
    near(net - today(), 3199);
  });

  it("MAZDA 3: 10,746 net, 286 less than today", () => {
    const net = netWithCar("CAR-13");
    near(net, 10746);
    near(net - today(), -286);
  });
});

describe("credits larger than the tax", () => {
  // 6,000 gross: tax before credits 600 (10%). Credits: 2.75 points x 242 = 665.5, plus 35% of the 360 pension = 126.
  const lowPaid = profile(6000, { pensionRate: 6, creditPoints: 2.75 });

  it("leaves income tax at zero and never negative", () => {
    const result = calculateNet(lowPaid, NO_ARRANGEMENT, netMethod);
    expect(result.taxBeforeCredits).toBeCloseTo(600, 9);
    expect(result.creditPointsCredit + result.pensionCredit).toBeGreaterThan(result.taxBeforeCredits);
    expect(result.incomeTax).toBe(0);
    // 6,000 - 360 pension - 62.40 national insurance (1.04%) - 193.80 health (3.23%)
    expect(result.net).toBeCloseTo(6000 - 360 - 62.4 - 193.8, 9);
  });

  it("grosses up the electric bonus by the contributions only, since there is no tax", () => {
    // Per extra shekel the employee keeps 1 - 1.04% - 3.23% = 0.9573, so 250 net needs 250 / 0.9573 gross
    const grossUp = grossUpElectric(lowPaid, WITHOUT_GROSS_UP, netMethod, rules.electric);
    expect(grossUp).toBeCloseTo(250 / (1 - 0.0104 - 0.0323), 9);
  });
});

describe("pay above the national insurance ceiling", () => {
  // Contributions stop at 50,695: 7,522 at the low rate, the rest at the high rate
  const NATIONAL_INSURANCE_AT_CEILING = 7522 * 0.0104 + (50695 - 7522) * 0.07; // 78.2288 + 3,022.11
  const HEALTH_AT_CEILING = 7522 * 0.0323 + (50695 - 7522) * 0.0517; // 242.9606 + 2,232.0441

  it("charges the same national insurance and health on any income above the ceiling", () => {
    for (const salary of [60000, 80000]) {
      const result = calculateNet(profile(salary), NO_ARRANGEMENT, netMethod);
      expect(result.nationalInsurance).toBeCloseTo(NATIONAL_INSURANCE_AT_CEILING, 6);
      expect(result.health).toBeCloseTo(HEALTH_AT_CEILING, 6);
    }
    expect(NATIONAL_INSURANCE_AT_CEILING).toBeCloseTo(3100.3388, 4);
    expect(HEALTH_AT_CEILING).toBeCloseTo(2475.0047, 4);
  });

  it("stops exactly at the ceiling: one shekel above adds nothing, one below removes the high rate", () => {
    const atCeiling = calculateNet(profile(50695), NO_ARRANGEMENT, netMethod);
    const above = calculateNet(profile(50696), NO_ARRANGEMENT, netMethod);
    const below = calculateNet(profile(50694), NO_ARRANGEMENT, netMethod);
    expect(above.nationalInsurance).toBeCloseTo(atCeiling.nationalInsurance, 9);
    expect(above.health).toBeCloseTo(atCeiling.health, 9);
    expect(atCeiling.nationalInsurance - below.nationalInsurance).toBeCloseTo(0.07, 9);
    expect(atCeiling.health - below.health).toBeCloseTo(0.0517, 9);
  });

  it("charges the top tax bracket above 60,130: 70,000 gives 24,035.20 before credits", () => {
    // 10% of 7,010 + 14% of 3,050 + 20% of 6,090 + 31% of 6,290 + 35% of 24,250 + 47% of 13,440 + 50% of 9,870
    const expected = 701 + 427 + 1218 + 1949.9 + 8487.5 + 6316.8 + 4935;
    expect(expected).toBeCloseTo(24035.2, 9);
    expect(calculateNet(profile(70000), NO_ARRANGEMENT, netMethod).taxBeforeCredits).toBeCloseTo(expected, 9);
  });

  it("changes the tax rate exactly at a bracket limit", () => {
    expect(calculateNet(profile(7010), NO_ARRANGEMENT, netMethod).taxBeforeCredits).toBeCloseTo(701, 9);
    expect(calculateNet(profile(7011), NO_ARRANGEMENT, netMethod).taxBeforeCredits).toBeCloseTo(701.14, 9); // the next shekel at 14%
  });
});

describe("a gross-up that crosses a tax bracket", () => {
  // 16,000 pay + 100 usage value = 16,100 taxable: 50 below the 16,150 limit where the rate jumps from 20% to 31%
  const nearLimit = profile(16000);
  const inputs = { ...WITHOUT_GROSS_UP, usageValue: 100 };
  const room = 16150 - 16100;

  it("is exact when part of the gross-up is taxed at 20% and the rest at 31%", () => {
    const keptBelow = 1 - 0.2 - MARGINAL_CONTRIBUTIONS; // per shekel up to the limit
    const keptAbove = 1 - 0.31 - MARGINAL_CONTRIBUTIONS; // per shekel above it
    // The first `room` shekels keep 0.6783 each; the net still missing is earned at 0.5683 per shekel
    const expected = room + (250 - keptBelow * room) / keptAbove;
    const grossUp = grossUpElectric(nearLimit, inputs, netMethod, rules.electric);
    expect(grossUp).toBeCloseTo(expected, 9);
    // It lies between "all of it at 20%" and "all of it at 31%"
    expect(grossUp).toBeGreaterThan(250 / keptBelow);
    expect(grossUp).toBeLessThan(250 / keptAbove);
  });

  it("still leaves the employee exactly 250 more", () => {
    const grossUp = grossUpElectric(nearLimit, inputs, netMethod, rules.electric);
    const before = calculateNet(nearLimit, { ...inputs, electricGrossUp: 0 }, netMethod).net;
    const after = calculateNet(nearLimit, { ...inputs, electricGrossUp: grossUp }, netMethod).net;
    expect(after - before).toBeCloseTo(250, 9);
  });
});

describe("electric method gross", () => {
  const gross: ElectricRules = { netBonus: 250, method: "gross" };
  // Noa-like pay in the 31% bracket, with ATTO 3's usage value 3,130 and participation 300
  const noa = profile(18500, { pensionRate: 6, creditPoints: 2.75 });
  const inputs = { ...WITHOUT_GROSS_UP, usageValue: 3130, participation: 300 };

  it("pays the amount itself, 250, as a gross figure", () => {
    expect(grossUpElectric(noa, inputs, netMethod, gross)).toBe(250);
  });

  it("is taxed, so the employee keeps less than 250 of it", () => {
    const before = calculateNet(noa, { ...inputs, electricGrossUp: 0 }, netMethod).net;
    const after = calculateNet(noa, { ...inputs, electricGrossUp: 250 }, netMethod).net;
    // 250 x (1 - 31% - 12.17%) = 142.075
    expect(after - before).toBeCloseTo(250 * (1 - 0.31 - MARGINAL_CONTRIBUTIONS), 9);
  });

  it("gross_up on the same pay grosses it up to about 440, the sheet's value for Noa", () => {
    const grossUp = grossUpElectric(noa, inputs, netMethod, rules.electric);
    expect(grossUp).toBeCloseTo(250 / (1 - 0.31 - MARGINAL_CONTRIBUTIONS), 9);
    near(grossUp, 440);
  });
});

describe("facts that hold for every sample employee", () => {
  let employees: Array<{ id: string; profile: EmployeeProfile }>;

  beforeAll(async () => {
    const data = await new FilesReferenceDataSource(path.join(__dirname, "..", "..", "data")).load();
    employees = data.sampleEmployees.map((employee) => ({ id: employee.id, profile: employee.profile }));
  });

  it("gets the same pension credit, 232.75, because 6% or more of the pay is above the cap (ARCHITECTURE section 12)", () => {
    expect(employees).toHaveLength(6);
    for (const employee of employees) {
      const result = calculateNet(employee.profile, NO_ARRANGEMENT, netMethod);
      expect(result.pensionCredit, employee.id).toBeCloseTo(232.75, 9);
    }
  });

  it("does not round inside the calculation: Noa's net is 11,031.819, not a whole shekel", () => {
    const noa = employees.find((employee) => employee.id === "E-001");
    if (!noa) throw new Error("E-001 is missing");
    const result = calculateNet(noa.profile, { ...NO_ARRANGEMENT, usageValue: 4070, participation: 300 }, netMethod);
    expect(Number.isInteger(result.net)).toBe(false);
    expect(result.net).toBeCloseTo(11031.819, 2);
  });
});
