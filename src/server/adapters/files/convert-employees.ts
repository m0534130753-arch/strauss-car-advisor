import type { CarArrangement, EmployeeProfile, Field } from "@/server/domain/model";
import type { SampleEmployee } from "@/server/ports/reference-data-source";
import { EMPLOYEES_FILE } from "./file-names";
import { parseFile } from "./reference-data-error";
import { EmployeesFileSchema, type EmployeeRow } from "./schemas";

// Demo data is given, not extracted from a payslip, so every field is confirmed.
function demoField<T>(value: T): Field<T> {
  return { value, source: "demo", confirmed: true };
}

function profileOf(row: EmployeeRow): EmployeeProfile {
  return {
    occupationId: demoField(row.occupationId),
    baseSalary: demoField(row.profile.baseSalary),
    commissions: demoField(row.profile.commissions),
    bonus: demoField(row.profile.bonus),
    pensionRate: demoField(row.profile.pensionRate),
    studyFundRate: demoField(row.profile.studyFundRate),
    creditPoints: demoField(row.profile.creditPoints),
    childrenUnder23: demoField(row.profile.childrenUnder23),
  };
}

function arrangementOf(row: EmployeeRow): CarArrangement {
  const arrangement = row.currentArrangement;
  if (arrangement.kind === "waiver") return { kind: "waiver" };
  return {
    kind: "company_car",
    vehicle: { kind: "catalog", vehicleId: arrangement.vehicleId },
    participation: demoField(arrangement.participation),
  };
}

export function convertEmployees(raw: unknown): SampleEmployee[] {
  return parseFile(EMPLOYEES_FILE, EmployeesFileSchema, raw).map((row) => ({
    id: row.id,
    name: row.name,
    profile: profileOf(row),
    currentArrangement: arrangementOf(row),
    question: row.question,
  }));
}
