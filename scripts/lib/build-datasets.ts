import ExcelJS from "exceljs";
import { z } from "zod";
import { ExcelImportError } from "./excel-cells";
import {
  CatalogFileSchema,
  EmployeesFileSchema,
  OccupationsFileSchema,
  ReferenceResultsFileSchema,
  type CatalogRow,
  type EmployeeRow,
  type OccupationRow,
  type ReferenceResultRow,
} from "@/server/adapters/files/schemas";
import { parseCatalog } from "./parse-catalog";
import { parseEmployees } from "./parse-employees";
import { parseOccupations } from "./parse-occupations";
import { parseReference } from "./parse-reference";

export type Datasets = {
  catalog: CatalogRow[];
  occupations: OccupationRow[];
  employees: EmployeeRow[];
  reference: ReferenceResultRow[];
};

// Index in rules.valueOfUse.driveField -> propulsion code (ARCHITECTURE decision 4: 0,1,2,3)
const PROPULSION_BY_DRIVE_INDEX: readonly CatalogRow["propulsion"][] = ["petrol", "hybrid", "plugin", "electric"];

export async function readWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
}

function validate<T>(name: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new ExcelImportError(`${name}: ${issues.join("; ")}`);
}

function assertUnique(name: string, values: readonly string[]): void {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate !== undefined) throw new ExcelImportError(`${name}: ערך כפול "${duplicate}"`);
}

// driveField comes from rules.valueOfUse.driveField: { "0": "בנזין", "1": "היברידי", ... }
function propulsionLabels(driveField: Readonly<Record<string, string>>): Map<string, CatalogRow["propulsion"]> {
  const labels = new Map<string, CatalogRow["propulsion"]>();
  PROPULSION_BY_DRIVE_INDEX.forEach((propulsion, index) => {
    const label = driveField[String(index)];
    if (typeof label !== "string") throw new ExcelImportError(`קובץ הכללים: חסר driveField["${index}"]`);
    labels.set(label, propulsion);
  });
  return labels;
}

export function buildDatasets(workbook: ExcelJS.Workbook, driveField: Readonly<Record<string, string>>): Datasets {
  const catalog = validate("קטלוג רכבים", CatalogFileSchema, parseCatalog(workbook, propulsionLabels(driveField)));
  assertUnique("קטלוג רכבים (מזהה)", catalog.map((vehicle) => vehicle.id));

  const occupations = validate("עיסוקים", OccupationsFileSchema, parseOccupations(workbook));
  assertUnique("עיסוקים (שם)", occupations.map((occupation) => occupation.name));

  const employees = validate("עובדים לדוגמה", EmployeesFileSchema, parseEmployees(workbook, catalog, occupations));
  assertUnique("עובדים לדוגמה (מזהה)", employees.map((employee) => employee.id));

  const reference = validate("חישובים", ReferenceResultsFileSchema, parseReference(workbook, catalog, occupations, employees));
  return { catalog, occupations, employees, reference };
}

// One format everywhere, so a rerun produces byte-identical files.
export function serializeDataset(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
