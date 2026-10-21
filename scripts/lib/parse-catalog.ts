import type ExcelJS from "exceljs";
import { ExcelImportError, readCode, readNumber, readTable, readText } from "./excel-cells";
import type { Vehicle } from "./excel-schemas";

const SHEET = "קטלוג רכבים";
const HEADERS = [
  "מזהה",
  "קבוצה",
  "תוצר",
  "קוד תוצר",
  "דגם (כינוי מסחרי)",
  "קוד דגם",
  "תאור דגם",
  "שנת רישום",
  "הנעה",
  "מחיר מחירון",
  "שווי שימוש חודשי",
  "עלות חודשית לחברה (דמה)",
  "השתתפות עובד ברירת מחדל (דמה)",
] as const;

// propulsionByLabel comes from rules.valueOfUse.driveField, not from the Excel column title.
// Unvalidated output: the caller validates the whole dataset with zod.
export function parseCatalog(workbook: ExcelJS.Workbook, propulsionByLabel: ReadonlyMap<string, Vehicle["propulsion"]>): unknown[] {
  return readTable(workbook, SHEET, HEADERS).map((row) => {
    const label = readText(row, "הנעה");
    const propulsion = propulsionByLabel.get(label);
    if (propulsion === undefined) {
      throw new ExcelImportError(`${SHEET} שורה ${row.rowNumber}, עמודה "הנעה": ערך לא מוכר "${label}"`);
    }
    return {
      id: readText(row, "מזהה"),
      group: readText(row, "קבוצה"),
      manufacturerName: readText(row, "תוצר"),
      commercialName: readText(row, "דגם (כינוי מסחרי)"),
      modelDescription: readText(row, "תאור דגם"),
      key: {
        registrationYear: readNumber(row, "שנת רישום"),
        manufacturerCode: readCode(row, "קוד תוצר"),
        modelCode: readCode(row, "קוד דגם"),
      },
      propulsion,
      listPrice: readNumber(row, "מחיר מחירון"),
      catalogUsageValue: readNumber(row, "שווי שימוש חודשי"),
      monthlyCost: readNumber(row, "עלות חודשית לחברה (דמה)"),
      defaultParticipation: readNumber(row, "השתתפות עובד ברירת מחדל (דמה)"),
    };
  });
}
