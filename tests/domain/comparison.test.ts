import { describe, expect, it } from "vitest";
import { buildChanges, type Figures } from "@/server/domain/comparison";
import type { ElectricRules } from "@/server/domain/model";

const grossUp: ElectricRules = { netBonus: 250, method: "gross_up" };

const car = (changes: Partial<Figures> = {}): Figures => ({
  kind: "car",
  usageValue: 4000,
  participation: 300,
  maintenance: 0,
  familyGapShare: 0,
  electricBonus: false,
  ...changes,
});

const waiver = (changes: Partial<Figures> = {}): Figures => ({
  kind: "waiver",
  usageValue: 0,
  participation: 0,
  maintenance: 1500,
  familyGapShare: 0,
  electricBonus: false,
  ...changes,
});

describe("buildChanges: car and waiver", () => {
  it("reports a changed usage value between two cars", () => {
    expect(buildChanges(car({ usageValue: 4070 }), car({ usageValue: 3130 }), grossUp)).toEqual([
      { kind: "usage_value", from: 4070, to: 3130 },
    ]);
  });

  it("reports nothing for the same usage value", () => {
    expect(buildChanges(car(), car(), grossUp)).toEqual([]);
  });

  it("reports a car given up for a waiver as one change", () => {
    expect(buildChanges(car({ usageValue: 4570, participation: 350 }), waiver({ maintenance: 2000 }), grossUp)).toEqual([
      { kind: "car_to_waiver", usageValueRemoved: 4570, maintenanceAdded: 2000 },
      { kind: "participation", from: 350, to: 0 },
    ]);
  });

  it("reports a waiver exchanged for a car as one change", () => {
    expect(buildChanges(waiver(), car({ usageValue: 2430, participation: 250 }), grossUp)).toEqual([
      { kind: "waiver_to_car", usageValueAdded: 2430, maintenanceRemoved: 1500 },
      { kind: "participation", from: 0, to: 250 },
    ]);
  });

  it("reports nothing between two waivers", () => {
    expect(buildChanges(waiver(), waiver(), grossUp)).toEqual([]);
  });
});

describe("buildChanges: electric bonus", () => {
  it("reports a gained bonus", () => {
    expect(buildChanges(car(), car({ electricBonus: true }), grossUp)).toEqual([
      { kind: "electric_bonus_added", netBonus: 250, method: "gross_up" },
    ]);
  });

  it("reports a lost bonus", () => {
    expect(buildChanges(car({ electricBonus: true }), car(), grossUp)).toEqual([
      { kind: "electric_bonus_removed", netBonus: 250, method: "gross_up" },
    ]);
  });

  it("reports nothing when both are electric", () => {
    expect(buildChanges(car({ electricBonus: true }), car({ electricBonus: true }), grossUp)).toEqual([]);
  });

  it("carries the method of the rules", () => {
    const gross: ElectricRules = { netBonus: 250, method: "gross" };
    expect(buildChanges(car(), car({ electricBonus: true }), gross)).toEqual([
      { kind: "electric_bonus_added", netBonus: 250, method: "gross" },
    ]);
  });
});

describe("buildChanges: participation and the family gap", () => {
  it("reports a changed participation and leaves an unchanged one out", () => {
    expect(buildChanges(car({ participation: 250 }), car({ participation: 500 }), grossUp)).toEqual([
      { kind: "participation", from: 250, to: 500 },
    ]);
  });

  it("reports the family gap when it appears, changes or disappears", () => {
    expect(buildChanges(car(), car({ familyGapShare: 1150 }), grossUp)).toEqual([{ kind: "family_gap", from: 0, to: 1150 }]);
    expect(buildChanges(car({ familyGapShare: 1150 }), car({ familyGapShare: 900 }), grossUp)).toEqual([
      { kind: "family_gap", from: 1150, to: 900 },
    ]);
    expect(buildChanges(car({ familyGapShare: 1150 }), car(), grossUp)).toEqual([{ kind: "family_gap", from: 1150, to: 0 }]);
  });
});

describe("buildChanges: order", () => {
  it("lists usage or maintenance, then electric, participation and the family gap", () => {
    const changes = buildChanges(
      car({ usageValue: 2950, participation: 250 }),
      car({ usageValue: 8120, participation: 500, familyGapShare: 1150, electricBonus: true }),
      grossUp,
    );
    expect(changes.map((change) => change.kind)).toEqual(["usage_value", "electric_bonus_added", "participation", "family_gap"]);
  });
});
