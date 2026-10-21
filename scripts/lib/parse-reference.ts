import type ExcelJS from "exceljs";
import { ExcelImportError, readNumber, readTable, readText, readYesNo, type TableRow } from "./excel-cells";
import type { Employee, Occupation, ReferenceArrangement, Vehicle } from "./excel-schemas";
import { findVehicle, parseAmount } from "./lookup";

const SHEET = "חישובים";
const HEADERS = [
  "מזהה",
  "היום",
  "החלופה",
  "זכאות",
  "סיבה",
  "נטו היום",
  "נטו בחלופה",
  "הפרש",
  "מס היום",
  "מס בחלופה",
  "ביטוח לאומי+בריאות היום",
  "ביטוח לאומי+בריאות בחלופה",
  "החזר חשמל ברוטו",
  "חלק העובד במסלול המשפחתי",
  "למה",
] as const;

const CAR_LABEL = /^(.+?)\s*\((\d{4})\)$/;
const WAIVER_LABEL = /^ויתור\s*[-–—]\s*אחזקת רכב\s*([\d,]+)\s*₪$/;

function parseArrangement(label: string, where: string, catalog: readonly Vehicle[]): ReferenceArrangement {
  const waiver = WAIVER_LABEL.exec(label);
  if (waiver) return { kind: "waiver", maintenanceAmount: parseAmount(waiver[1]) };
  const car = CAR_LABEL.exec(label);
  if (!car) throw new ExcelImportError(`${where}: פורמט לא מוכר "${label}"`);
  return { kind: "company_car", vehicleId: findVehicle(catalog, car[1], Number(car[2])).id };
}

// The reference sheet and the employee sheet describe the same starting point; a mismatch means a broken source.
function assertSameStart(today: ReferenceArrangement, employee: Employee, occupation: Occupation): void {
  const start = employee.currentArrangement;
  const matches =
    today.kind === "company_car"
      ? start.kind === "company_car" && start.vehicleId === today.vehicleId
      : start.kind === "waiver" && today.maintenanceAmount === occupation.maintenanceAmount;
  if (!matches) throw new ExcelImportError(`${SHEET} ${employee.id}: עמודת "היום" לא תואמת לרכב של העובד`);
}

function assertWaiverMatchesOccupation(alternative: ReferenceArrangement, employee: Employee, occupation: Occupation): void {
  if (alternative.kind !== "waiver") return;
  if (!occupation.waiverAllowed || alternative.maintenanceAmount !== occupation.maintenanceAmount) {
    throw new ExcelImportError(`${SHEET} ${employee.id}: סכום הוויתור בחלופה לא תואם לעיסוק "${occupation.name}"`);
  }
}

// Unvalidated output: the caller validates the whole dataset with zod.
export function parseReference(
  workbook: ExcelJS.Workbook,
  catalog: readonly Vehicle[],
  occupations: readonly Occupation[],
  employees: readonly Employee[],
): unknown[] {
  return readTable(workbook, SHEET, HEADERS).map((row: TableRow) => {
    const employeeId = readText(row, "מזהה");
    const employee = employees.find((candidate) => candidate.id === employeeId);
    if (!employee) throw new ExcelImportError(`${SHEET} שורה ${row.rowNumber}: עובד לא מוכר "${employeeId}"`);
    const occupation = occupations.find((candidate) => candidate.id === employee.occupationId);
    if (!occupation) throw new ExcelImportError(`${SHEET} ${employeeId}: עיסוק חסר`);

    const today = parseArrangement(readText(row, "היום"), `${SHEET} ${employeeId}, עמודה "היום"`, catalog);
    const alternative = parseArrangement(readText(row, "החלופה"), `${SHEET} ${employeeId}, עמודה "החלופה"`, catalog);
    assertSameStart(today, employee, occupation);
    assertWaiverMatchesOccupation(alternative, employee, occupation);

    return {
      employeeId,
      today,
      alternative,
      eligible: readYesNo(row, "זכאות"),
      reason: readText(row, "סיבה"),
      netToday: readNumber(row, "נטו היום"),
      netAlternative: readNumber(row, "נטו בחלופה"),
      difference: readNumber(row, "הפרש"),
      taxToday: readNumber(row, "מס היום"),
      taxAlternative: readNumber(row, "מס בחלופה"),
      socialToday: readNumber(row, "ביטוח לאומי+בריאות היום"),
      socialAlternative: readNumber(row, "ביטוח לאומי+בריאות בחלופה"),
      electricGrossRefund: readNumber(row, "החזר חשמל ברוטו"),
      familyEmployeeShare: readNumber(row, "חלק העובד במסלול המשפחתי"),
      conclusion: readText(row, "למה"),
    };
  });
}
