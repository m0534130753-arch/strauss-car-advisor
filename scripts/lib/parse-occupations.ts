import type ExcelJS from "exceljs";
import { ExcelImportError, readNumber, readTable, readText, readYesNo } from "./excel-cells";

const SHEET = "עיסוקים";
const HEADERS = ["עיסוק", "קבוצת זכאות", "רכב חובה", "מותר לוותר", "אחזקת רכב בוויתור (₪)"] as const;

// The sheet has no id column: ids follow the sheet order (OCC-01, OCC-02, ...), so reruns are stable.
// Unvalidated output: the caller validates the whole dataset with zod.
export function parseOccupations(workbook: ExcelJS.Workbook): unknown[] {
  return readTable(workbook, SHEET, HEADERS).map((row, index) => {
    const waiverAllowed = readYesNo(row, "מותר לוותר");
    const maintenanceAmount = readNumber(row, "אחזקת רכב בוויתור (₪)");
    if (!waiverAllowed && maintenanceAmount !== 0) {
      throw new ExcelImportError(`${SHEET} שורה ${row.rowNumber}: סכום אחזקה בעיסוק שאסור לוותר בו`);
    }
    return {
      id: `OCC-${String(index + 1).padStart(2, "0")}`,
      name: readText(row, "עיסוק"),
      group: readText(row, "קבוצת זכאות"),
      carRequired: readYesNo(row, "רכב חובה"),
      waiverAllowed,
      maintenanceAmount,
    };
  });
}
