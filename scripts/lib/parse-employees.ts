import type ExcelJS from "exceljs";
import { ExcelImportError, readNumber, readTable, readText } from "./excel-cells";
import type { EmployeeRow, OccupationRow, CatalogRow } from "@/server/adapters/files/schemas";
import { findVehicle, parseAmount } from "./lookup";

const SHEET = "עובדים לדוגמה";
// The "ת״ז (פיקטיבית)" column is deliberately not read: ID numbers never leave the source file.
const HEADERS = [
  "מזהה",
  "שם",
  "עיסוק",
  "קבוצה",
  "שכר בסיס",
  "עמלות",
  "בונוס",
  "פנסיה עובד %",
  "קרן השתלמות עובד %",
  "נקודות זיכוי",
  "ילדים עד 23",
  "רכב היום",
  "השתתפות היום",
  "השאלה",
] as const;

const NO_CAR = /^אין\s*\(אחזקה\s*([\d,]+)\s*₪\)$/;

// Unvalidated output: the caller validates the whole dataset with zod.
export function parseEmployees(
  workbook: ExcelJS.Workbook,
  catalog: readonly CatalogRow[],
  occupations: readonly OccupationRow[],
): unknown[] {
  return readTable(workbook, SHEET, HEADERS).map((row) => {
    const id = readText(row, "מזהה");
    const occupationName = readText(row, "עיסוק");
    const occupation = occupations.find((candidate) => candidate.name === occupationName);
    if (!occupation) throw new ExcelImportError(`${SHEET} ${id}: עיסוק לא מוכר "${occupationName}"`);
    if (occupation.group !== readText(row, "קבוצה")) {
      throw new ExcelImportError(`${SHEET} ${id}: הקבוצה בגיליון שונה מקבוצת העיסוק "${occupationName}"`);
    }

    return {
      id,
      name: readText(row, "שם"),
      occupationId: occupation.id,
      profile: {
        baseSalary: readNumber(row, "שכר בסיס"),
        commissions: readNumber(row, "עמלות"),
        bonus: readNumber(row, "בונוס"),
        pensionRate: readNumber(row, "פנסיה עובד %"),
        studyFundRate: readNumber(row, "קרן השתלמות עובד %"),
        creditPoints: readNumber(row, "נקודות זיכוי"),
        childrenUnder23: readNumber(row, "ילדים עד 23"),
      },
      currentArrangement: parseCurrentArrangement(row, id, occupation, catalog),
      question: readText(row, "השאלה"),
    };
  });
}

function parseCurrentArrangement(
  row: Parameters<typeof readText>[0],
  id: string,
  occupation: OccupationRow,
  catalog: readonly CatalogRow[],
): EmployeeRow["currentArrangement"] {
  const label = readText(row, "רכב היום");
  const noCar = NO_CAR.exec(label);
  if (noCar) {
    if (!occupation.waiverAllowed || parseAmount(noCar[1]) !== occupation.maintenanceAmount) {
      throw new ExcelImportError(`${SHEET} ${id}: הוויתור "${label}" לא תואם לעיסוק "${occupation.name}"`);
    }
    return { kind: "waiver" };
  }
  const vehicle = findVehicle(catalog, label);
  return { kind: "company_car", vehicleId: vehicle.id, participation: readNumber(row, "השתתפות היום") };
}
