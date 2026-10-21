import { readFileSync } from "node:fs";
import path from "node:path";
import type { ElectricRules, EmployeeProfile, Field, NetMethod, Propulsion } from "@/server/domain/model";
import type { NetInputs } from "@/server/domain/net";

// Reference data for the engine tests: the Strauss rules file plus the JSON generated from the workbook (S1-T1).
// The rules are passed as they are in the file; the loader (S1-T4) will take over the conversion.

const DATA_FOLDER = path.join(__dirname, "..", "..", "data");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_FOLDER, file), "utf8")) as T;
}

type CatalogRow = { id: string; commercialName: string; propulsion: Propulsion; catalogUsageValue: number; defaultParticipation: number };
type OccupationRow = { id: string; name: string; maintenanceAmount: number };
type EmployeeRow = {
  id: string;
  name: string;
  occupationId: string;
  profile: Record<"baseSalary" | "commissions" | "bonus" | "pensionRate" | "studyFundRate" | "creditPoints" | "childrenUnder23", number>;
  currentArrangement: { kind: "company_car"; vehicleId: string; participation: number } | { kind: "waiver" };
};
type ReferenceArrangement = { kind: "company_car"; vehicleId: string } | { kind: "waiver"; maintenanceAmount: number };
export type ReferenceRow = {
  employeeId: string;
  today: ReferenceArrangement;
  alternative: ReferenceArrangement;
  netToday: number;
  netAlternative: number;
  difference: number;
  taxToday: number;
  taxAlternative: number;
  socialToday: number;
  socialAlternative: number;
  electricGrossRefund: number;
  familyEmployeeShare: number;
};

export const rules = readJson<{ netMethod: NetMethod; electric: ElectricRules }>("strauss-rules.json");
export const referenceRows = readJson<ReferenceRow[]>("reference-results.json");
const catalog = readJson<CatalogRow[]>("catalog.json");
const occupations = readJson<OccupationRow[]>("occupations.json");
const employees = readJson<EmployeeRow[]>("sample-employees.json");

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`reference data is incomplete: ${what}`);
  return value;
}

const demo = (value: number): Field<number> => ({ value, source: "demo", confirmed: true });

export function profileOf(employee: EmployeeRow): EmployeeProfile {
  const { profile } = employee;
  return {
    occupationId: { value: employee.occupationId, source: "demo", confirmed: true },
    baseSalary: demo(profile.baseSalary),
    commissions: demo(profile.commissions),
    bonus: demo(profile.bonus),
    pensionRate: demo(profile.pensionRate),
    studyFundRate: demo(profile.studyFundRate),
    creditPoints: demo(profile.creditPoints),
    childrenUnder23: demo(profile.childrenUnder23),
  };
}

export type ReferenceCase = {
  row: ReferenceRow;
  profile: EmployeeProfile;
  todayInputs: Omit<NetInputs, "electricGrossUp">;
  alternativeInputs: Omit<NetInputs, "electricGrossUp">;
  todayIsElectric: boolean;
  alternativeIsElectric: boolean;
};

// The prepared numbers that eligibility and the application layer will later hand to the engine.
function inputsOf(
  arrangement: ReferenceArrangement,
  participationOf: (vehicle: CatalogRow) => number,
  familyGapShare: number,
): { inputs: Omit<NetInputs, "electricGrossUp">; isElectric: boolean } {
  if (arrangement.kind === "waiver") {
    return {
      inputs: { usageValue: 0, participation: 0, maintenance: arrangement.maintenanceAmount, familyGapShare },
      isElectric: false,
    };
  }
  const vehicle = required(catalog.find((candidate) => candidate.id === arrangement.vehicleId), arrangement.vehicleId);
  return {
    inputs: {
      usageValue: vehicle.catalogUsageValue,
      participation: participationOf(vehicle),
      maintenance: 0,
      familyGapShare,
    },
    isElectric: vehicle.propulsion === "electric",
  };
}

export function buildReferenceCases(): ReferenceCase[] {
  return referenceRows.map((row) => {
    const employee = required(employees.find((candidate) => candidate.id === row.employeeId), row.employeeId);
    required(occupations.find((candidate) => candidate.id === employee.occupationId), employee.occupationId);
    const start = employee.currentArrangement;
    const today = inputsOf(row.today, () => (start.kind === "company_car" ? start.participation : 0), 0);
    const alternative = inputsOf(row.alternative, (vehicle) => vehicle.defaultParticipation, row.familyEmployeeShare);
    return {
      row,
      profile: profileOf(employee),
      todayInputs: today.inputs,
      alternativeInputs: alternative.inputs,
      todayIsElectric: today.isElectric,
      alternativeIsElectric: alternative.isElectric,
    };
  });
}
