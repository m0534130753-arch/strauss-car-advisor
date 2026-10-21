import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import type { CarArrangement, EmployeeProfile, Field } from "@/server/domain/model";
import {
  checkEligibility,
  listEligibleOptions,
  type EligibilityData,
  type EligibilityResult,
} from "@/server/domain/eligibility";
import { FilesReferenceDataSource } from "@/server/adapters/files/files-reference-data-source";

// Real data (rules, catalog, occupations, six sample employees), loaded through the real loader.
let data: EligibilityData;
let profiles: Record<string, EmployeeProfile>;
let todays: Record<string, CarArrangement>;

beforeAll(async () => {
  const loaded = await new FilesReferenceDataSource(path.join(__dirname, "..", "..", "data")).load();
  data = { catalog: loaded.catalog, occupations: loaded.occupations, rules: loaded.rules };
  profiles = Object.fromEntries(loaded.sampleEmployees.map((employee) => [employee.id, employee.profile]));
  todays = Object.fromEntries(loaded.sampleEmployees.map((employee) => [employee.id, employee.currentArrangement]));
});

const car = (vehicleId: string): CarArrangement => ({ kind: "company_car", vehicle: { kind: "catalog", vehicleId } });
const waiver: CarArrangement = { kind: "waiver" };
const field = <T>(value: T, confirmed = true): Field<T> => ({ value, source: "demo", confirmed });

// Noa (E-001): group ג, product manager.  David (E-002): group ב, field sales, five children, car required.
// Rachel (E-003): group ב, developer, today a waiver.  Eli (E-006): group ד, department manager.
const withProfile = (id: string, changes: Partial<EmployeeProfile>): EmployeeProfile => ({ ...profiles[id], ...changes });

function expectEligible(result: EligibilityResult) {
  if (result.status !== "eligible") throw new Error(`expected eligible, got ${result.status}: ${result.reasons.join(",")}`);
  return result;
}

describe("regular company car", () => {
  it("is eligible from the employee's own group, and an electric car brings the electric bonus", () => {
    const result = expectEligible(checkEligibility(profiles["E-001"], car("CAR-10"), data)); // ATTO 3, group ג, electric
    expect(result.reasons).toEqual(["OWN_OR_LOWER_GROUP", "ELECTRIC_BONUS"]);
    expect(result.entitlements).toEqual({ budget: 4500, electricBonus: true, familyGapEmployeeShare: 0, maintenanceAmount: 0 });
  });

  it("is eligible from a lower group, and a petrol car has no electric bonus", () => {
    const result = expectEligible(checkEligibility(profiles["E-001"], car("CAR-07"), data)); // COROLLA, group ב
    expect(result.reasons).toEqual(["OWN_OR_LOWER_GROUP"]);
    expect(result.entitlements.electricBonus).toBe(false);
  });

  it("gives no electric bonus to a plug-in hybrid", () => {
    const result = expectEligible(checkEligibility(profiles["E-006"], car("CAR-16"), data)); // SPORTAGE HEV, plugin, group ד
    expect(result.reasons).toEqual(["OWN_OR_LOWER_GROUP"]);
    expect(result.entitlements.electricBonus).toBe(false);
  });

  it("is not allowed from a higher group, and with the real prices it is also over the budget", () => {
    const result = checkEligibility(profiles["E-001"], car("CAR-14"), data); // MODEL 3 (5,100), group ד, for a group ג employee (4,500)
    expect(result).toEqual({ status: "ineligible", reasons: ["GROUP_TOO_HIGH", "COST_EXCEEDS_BUDGET"] });
  });

  it("reports only the group when a higher group car happens to fit the budget", () => {
    const cheap = { ...data, catalog: data.catalog.map((v) => (v.id === "CAR-14" ? { ...v, monthlyCost: 4000 } : v)) };
    expect(checkEligibility(profiles["E-001"], car("CAR-14"), cheap)).toEqual({ status: "ineligible", reasons: ["GROUP_TOO_HIGH"] });
  });

  it("is not allowed when the car costs more than the employee's budget", () => {
    const pricey = { ...data, catalog: data.catalog.map((v) => (v.id === "CAR-09" ? { ...v, monthlyCost: 4501 } : v)) };
    expect(checkEligibility(profiles["E-001"], car("CAR-09"), pricey)).toEqual({
      status: "ineligible",
      reasons: ["COST_EXCEEDS_BUDGET"],
    });
  });

  it("allows a cost exactly at the budget", () => {
    const atBudget = { ...data, catalog: data.catalog.map((v) => (v.id === "CAR-09" ? { ...v, monthlyCost: 4500 } : v)) };
    expectEligible(checkEligibility(profiles["E-001"], car("CAR-09"), atBudget));
  });

  it("is not allowed when the car is not in the catalog", () => {
    expect(checkEligibility(profiles["E-001"], car("CAR-99"), data)).toEqual({ status: "ineligible", reasons: ["NOT_IN_CATALOG"] });
  });

  it("is not allowed when the car comes from the tax registry", () => {
    const fromRegistry: CarArrangement = {
      kind: "company_car",
      vehicle: {
        kind: "tax_registry",
        key: { taxYear: 2026, registrationYear: 2025, vehicleTypeCode: "1", manufacturerCode: "01014", modelCode: "00003" },
        usageValue: 3130,
        label: "BYD ATTO 3",
      },
    };
    expect(checkEligibility(profiles["E-001"], fromRegistry, data)).toEqual({ status: "ineligible", reasons: ["NOT_IN_CATALOG"] });
  });

  it("treats a family-group car that is not on the family track as too high", () => {
    const noFamilyCars = {
      catalog: data.catalog.map((v) => (v.id === "CAR-19" ? { ...v, monthlyCost: 3000 } : v)), // keeps the cost out of the way
      occupations: data.occupations,
      rules: { ...data.rules, familyTrack: { ...data.rules.familyTrack, cars: [] } },
    };
    expect(checkEligibility(profiles["E-002"], car("CAR-19"), noFamilyCars)).toEqual({
      status: "ineligible",
      reasons: ["GROUP_TOO_HIGH"],
    });
  });
});

describe("family track", () => {
  it("David: five children, the employee pays half of the gap above his group budget (6,000 - 3,700) / 2 = 1,150", () => {
    const result = expectEligible(checkEligibility(profiles["E-002"], car("CAR-19"), data)); // CARNIVAL
    expect(result.reasons).toEqual(["FAMILY_TRACK"]);
    expect(result.entitlements).toEqual({ budget: 3700, electricBonus: false, familyGapEmployeeShare: 1150, maintenanceAmount: 0 });
  });

  it("is not blocked by a required car: David's occupation requires a car and is still eligible", () => {
    expectEligible(checkEligibility(profiles["E-002"], car("CAR-20"), data));
  });

  it("is not allowed with fewer children than the minimum", () => {
    const threeChildren = withProfile("E-002", { childrenUnder23: field(3) });
    expect(checkEligibility(threeChildren, car("CAR-19"), data)).toEqual({
      status: "ineligible",
      reasons: ["FAMILY_TRACK_NOT_ENOUGH_CHILDREN"],
    });
  });

  it("needs data when the number of children is unknown or unconfirmed", () => {
    const unknown = withProfile("E-002", { childrenUnder23: undefined });
    const unconfirmed = withProfile("E-002", { childrenUnder23: field(5, false) });
    for (const profile of [unknown, unconfirmed]) {
      expect(checkEligibility(profile, car("CAR-19"), data)).toEqual({
        status: "needs_data",
        reasons: [],
        missingFields: ["childrenUnder23"],
      });
    }
  });

  it("has no gap when the car costs no more than the budget", () => {
    const cheap = { ...data, catalog: data.catalog.map((v) => (v.id === "CAR-19" ? { ...v, monthlyCost: 3000 } : v)) };
    const result = expectEligible(checkEligibility(profiles["E-002"], car("CAR-19"), cheap));
    expect(result.entitlements.familyGapEmployeeShare).toBe(0);
  });

  it("brings the electric bonus to an electric family car", () => {
    const electric = { ...data, catalog: data.catalog.map((v) => (v.id === "CAR-19" ? { ...v, propulsion: "electric" as const } : v)) };
    const result = expectEligible(checkEligibility(profiles["E-002"], car("CAR-19"), electric));
    expect(result.reasons).toEqual(["FAMILY_TRACK", "ELECTRIC_BONUS"]);
    expect(result.entitlements.electricBonus).toBe(true);
  });
});

describe("waiver", () => {
  it("is allowed with the occupation's maintenance amount", () => {
    const result = expectEligible(checkEligibility(profiles["E-003"], waiver, data)); // developer, 1,500
    expect(result.reasons).toEqual(["WAIVER_ALLOWED"]);
    expect(result.entitlements).toEqual({ budget: 3700, electricBonus: false, familyGapEmployeeShare: 0, maintenanceAmount: 1500 });
    expect(expectEligible(checkEligibility(profiles["E-006"], waiver, data)).entitlements.maintenanceAmount).toBe(2600);
  });

  it("is blocked when a car is required, and also not allowed (both reasons are collected)", () => {
    expect(checkEligibility(profiles["E-002"], waiver, data)).toEqual({
      status: "ineligible",
      reasons: ["WAIVER_BLOCKED_CAR_REQUIRED", "WAIVER_NOT_ALLOWED"],
    });
  });

  it("is not allowed when the occupation does not permit it", () => {
    const noWaiver = {
      ...data,
      occupations: data.occupations.map((o) => (o.id === "OCC-10" ? { ...o, waiverAllowed: false, maintenanceAmount: 0 } : o)),
    };
    expect(checkEligibility(profiles["E-001"], waiver, noWaiver)).toEqual({ status: "ineligible", reasons: ["WAIVER_NOT_ALLOWED"] });
  });
});

describe("unknown occupation", () => {
  it("needs data when the occupation is missing, unconfirmed or not in the list", () => {
    const missing = withProfile("E-001", { occupationId: undefined });
    const unconfirmed = withProfile("E-001", { occupationId: field("OCC-10", false) });
    const unknown = withProfile("E-001", { occupationId: field("OCC-99") });
    for (const profile of [missing, unconfirmed, unknown]) {
      expect(checkEligibility(profile, car("CAR-10"), data)).toEqual({
        status: "needs_data",
        reasons: [],
        missingFields: ["occupationId"],
      });
    }
  });
});

describe("same as the current arrangement", () => {
  it("is a note only: the status still follows the other rules", () => {
    const result = expectEligible(checkEligibility(profiles["E-001"], car("CAR-09"), data, todays["E-001"]));
    expect(result.reasons).toEqual(["SAME_AS_CURRENT", "OWN_OR_LOWER_GROUP"]);
  });

  it("applies to a waiver that matches today's waiver", () => {
    const result = expectEligible(checkEligibility(profiles["E-003"], waiver, data, todays["E-003"]));
    expect(result.reasons).toEqual(["SAME_AS_CURRENT", "WAIVER_ALLOWED"]);
  });

  it("is not noted for a different car, or for a car against a waiver", () => {
    expect(checkEligibility(profiles["E-001"], car("CAR-10"), data, todays["E-001"]).reasons).not.toContain("SAME_AS_CURRENT");
    expect(checkEligibility(profiles["E-001"], waiver, data, todays["E-001"]).reasons).not.toContain("SAME_AS_CURRENT");
    expect(checkEligibility(profiles["E-003"], car("CAR-06"), data, todays["E-003"]).reasons).not.toContain("SAME_AS_CURRENT");
  });

  it("is noted for the same registry car, but the registry car is still not eligible", () => {
    const registryCar: CarArrangement = {
      kind: "company_car",
      vehicle: {
        kind: "tax_registry",
        key: { taxYear: 2026, registrationYear: 2025, vehicleTypeCode: "1", manufacturerCode: "01014", modelCode: "00003" },
        usageValue: 3130,
        label: "BYD ATTO 3",
      },
    };
    expect(checkEligibility(profiles["E-001"], registryCar, data, registryCar)).toEqual({
      status: "ineligible",
      reasons: ["SAME_AS_CURRENT", "NOT_IN_CATALOG"],
    });
  });

  it("is not noted when today's car is from the registry and the alternative is a catalog car", () => {
    const registryToday: CarArrangement = {
      kind: "company_car",
      vehicle: {
        kind: "tax_registry",
        key: { taxYear: 2026, registrationYear: 2025, vehicleTypeCode: "1", manufacturerCode: "01014", modelCode: "00003" },
        usageValue: 3130,
        label: "BYD ATTO 3",
      },
    };
    const result = expectEligible(checkEligibility(profiles["E-001"], car("CAR-10"), data, registryToday));
    expect(result.reasons).toEqual(["OWN_OR_LOWER_GROUP", "ELECTRIC_BONUS"]);
  });

  it("is not noted for a registry car that differs from the current registry car", () => {
    const base = { taxYear: 2026, registrationYear: 2025, vehicleTypeCode: "1", manufacturerCode: "01014", modelCode: "00003" };
    const registry = (modelCode: string): CarArrangement => ({
      kind: "company_car",
      vehicle: { kind: "tax_registry", key: { ...base, modelCode }, usageValue: 3000, label: "x" },
    });
    expect(checkEligibility(profiles["E-001"], registry("00003"), data, registry("00004")).reasons).toEqual(["NOT_IN_CATALOG"]);
  });

  it("is still noted when the occupation is unknown", () => {
    const noOccupation = withProfile("E-003", { occupationId: undefined });
    expect(checkEligibility(noOccupation, waiver, data, waiver)).toEqual({
      status: "needs_data",
      reasons: ["SAME_AS_CURRENT"],
      missingFields: ["occupationId"],
    });
  });
});

describe("listEligibleOptions", () => {
  const idsOf = (options: ReturnType<typeof listEligibleOptions>) =>
    options.map((o) => (o.arrangement.kind === "waiver" ? "waiver" : o.arrangement.vehicle.kind === "catalog" ? o.arrangement.vehicle.vehicleId : "?"));

  it("lists own and lower group cars for an ordinary employee, in catalog order, with the waiver last", () => {
    const ids = idsOf(listEligibleOptions(profiles["E-003"], data)); // Rachel: group ב, waiver allowed
    expect(ids).toEqual(["CAR-01", "CAR-02", "CAR-03", "CAR-04", "CAR-05", "CAR-06", "CAR-07", "CAR-08", "waiver"]);
  });

  it("offers the family cars only with enough children, and no waiver where a car is required", () => {
    const ids = idsOf(listEligibleOptions(profiles["E-002"], data)); // David: five children, car required
    expect(ids).toContain("CAR-19");
    expect(ids).toContain("CAR-20");
    expect(ids).not.toContain("waiver");
    expect(ids).not.toContain("CAR-09");
    const fewChildren = idsOf(listEligibleOptions(withProfile("E-002", { childrenUnder23: field(2) }), data));
    expect(fewChildren).not.toContain("CAR-19");
  });

  it("gives the entitlements of every option, and notes the current arrangement", () => {
    const options = listEligibleOptions(profiles["E-001"], data, todays["E-001"]);
    const atto3 = options.find((o) => idsOf([o])[0] === "CAR-10");
    expect(atto3?.entitlements.electricBonus).toBe(true);
    const current = options.find((o) => idsOf([o])[0] === "CAR-09");
    expect(current?.reasons).toContain("SAME_AS_CURRENT");
  });

  it("lists nothing when the occupation is unknown", () => {
    expect(listEligibleOptions(withProfile("E-001", { occupationId: undefined }), data)).toEqual([]);
  });

  it("agrees with checkEligibility for every catalog car and the waiver", () => {
    for (const id of ["E-001", "E-002", "E-003", "E-004", "E-005", "E-006"]) {
      const listed = idsOf(listEligibleOptions(profiles[id], data));
      for (const vehicle of data.catalog) {
        const result = checkEligibility(profiles[id], car(vehicle.id), data);
        expect(listed.includes(vehicle.id), `${id} ${vehicle.id}`).toBe(result.status === "eligible");
      }
      expect(listed.includes("waiver"), `${id} waiver`).toBe(checkEligibility(profiles[id], waiver, data).status === "eligible");
    }
  });
});
