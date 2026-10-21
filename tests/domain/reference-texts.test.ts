import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildChanges } from "@/server/domain/comparison";
import { checkEligibility, type EligibilityData } from "@/server/domain/eligibility";
import type { CarArrangement, EmployeeProfile } from "@/server/domain/model";
import { FilesReferenceDataSource } from "@/server/adapters/files/files-reference-data-source";
import { describeChanges } from "@/server/i18n/describe-changes";
import { describeReasons } from "@/server/i18n/describe-reasons";
import type { ReferenceResultRow } from "@/server/adapters/files/schemas";
import { alternativeFigures, todayFigures } from "../support/figures";

// The reason and the conclusion must be word for word the sheet's "סיבה" and "למה" columns (ARCHITECTURE decision 23).
const DATA_FOLDER = path.join(__dirname, "..", "..", "data");
const referenceRows: ReferenceResultRow[] = JSON.parse(readFileSync(path.join(DATA_FOLDER, "reference-results.json"), "utf8"));

let data: EligibilityData;
let profiles: Map<string, EmployeeProfile>;
let todays: Map<string, CarArrangement>;

beforeAll(async () => {
  const loaded = await new FilesReferenceDataSource(DATA_FOLDER).load();
  data = { catalog: loaded.catalog, occupations: loaded.occupations, rules: loaded.rules };
  profiles = new Map(loaded.sampleEmployees.map((employee) => [employee.id, employee.profile]));
  todays = new Map(loaded.sampleEmployees.map((employee) => [employee.id, employee.currentArrangement]));
});

function alternativeOf(row: ReferenceResultRow): CarArrangement {
  return row.alternative.kind === "waiver"
    ? { kind: "waiver" }
    : { kind: "company_car", vehicle: { kind: "catalog", vehicleId: row.alternative.vehicleId } };
}

function textsFor(row: ReferenceResultRow): { reason: string; conclusion: string } {
  const profile = profiles.get(row.employeeId);
  const current = todays.get(row.employeeId);
  if (!profile || !current) throw new Error(`unknown employee ${row.employeeId}`);
  const alternative = alternativeOf(row);

  const result = checkEligibility(profile, alternative, data, current);
  if (result.status !== "eligible") throw new Error(`${row.employeeId} should be eligible`);

  const occupation = data.occupations.find((o) => o.id === profile.occupationId?.value);
  const today = todayFigures(current, occupation?.maintenanceAmount ?? 0, data);
  const figures = alternativeFigures(alternative, result.entitlements, data);

  const { familyTrack, electric } = data.rules;
  const reason = describeReasons(result.reasons, {
    children: profile.childrenUnder23?.value,
    minChildren: familyTrack.minChildren,
    gapSplitEmployee: familyTrack.gapSplitEmployee,
  });
  return { reason, conclusion: describeChanges(buildChanges(today, figures, electric)) };
}

describe("texts match the sheet word for word", () => {
  it("has the six sample employees", () => {
    expect(referenceRows).toHaveLength(6);
  });

  for (const row of referenceRows) {
    it(`${row.employeeId}: the reason`, () => {
      expect(textsFor(row).reason).toBe(row.reason);
    });

    it(`${row.employeeId}: the conclusion`, () => {
      expect(textsFor(row).conclusion).toBe(row.conclusion);
    });
  }
});
