import type ExcelJS from "exceljs";

export class ExcelImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelImportError";
  }
}

export type TableRow = {
  sheet: string;
  rowNumber: number;
  values: Map<string, unknown>;
};

// Reduces any Excel cell (rich text, formula result, plain value) to string | number | boolean | null.
function normalizeCell(value: ExcelJS.CellValue, where: string): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object" && !(value instanceof Date)) {
    if ("richText" in value) return normalizeCell(value.richText.map((part) => part.text).join(""), where);
    if ("result" in value) return normalizeCell(value.result as ExcelJS.CellValue, where);
    if ("text" in value) return normalizeCell(value.text as ExcelJS.CellValue, where);
  }
  throw new ExcelImportError(`${where}: סוג תא לא נתמך`);
}

// Reads a sheet into rows keyed by header name (never by column position). Empty rows are skipped.
export function readTable(workbook: ExcelJS.Workbook, sheet: string, required: readonly string[]): TableRow[] {
  const worksheet = workbook.getWorksheet(sheet);
  if (!worksheet) throw new ExcelImportError(`חסר גיליון "${sheet}"`);

  const columnByHeader = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => {
    const header = normalizeCell(cell.value, `${sheet}, כותרת בעמודה ${column}`);
    if (typeof header === "string") columnByHeader.set(header, column);
  });

  const columns: Array<[string, number]> = required.map((header) => {
    const column = columnByHeader.get(header);
    if (column === undefined) throw new ExcelImportError(`גיליון "${sheet}": חסרה עמודה "${header}"`);
    return [header, column];
  });

  const rows: TableRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const values = new Map<string, unknown>();
    for (const [header, column] of columns) {
      const cell = worksheet.getRow(rowNumber).getCell(column);
      values.set(header, normalizeCell(cell.value, `${sheet} שורה ${rowNumber}, עמודה "${header}"`));
    }
    if ([...values.values()].some((value) => value !== null)) rows.push({ sheet, rowNumber, values });
  }
  return rows;
}

function fail(row: TableRow, header: string, expectation: string): never {
  const found = JSON.stringify(row.values.get(header) ?? null);
  throw new ExcelImportError(`${row.sheet} שורה ${row.rowNumber}, עמודה "${header}": ${expectation} (נמצא: ${found})`);
}

export function readText(row: TableRow, header: string): string {
  const value = row.values.get(header);
  if (typeof value !== "string") fail(row, header, "נדרש טקסט");
  return value as string;
}

// Numbers only: a text cell would hide a formatting problem in the source.
export function readNumber(row: TableRow, header: string): number {
  const value = row.values.get(header);
  if (typeof value !== "number" || !Number.isFinite(value)) fail(row, header, "נדרש מספר");
  return value as number;
}

// Registry codes must arrive as text, otherwise leading zeros ('00885') are already lost.
export function readCode(row: TableRow, header: string): string {
  const value = row.values.get(header);
  if (typeof value !== "string" || !/^\d{5}$/.test(value)) fail(row, header, "נדרשת מחרוזת של 5 ספרות");
  return value as string;
}

export function readYesNo(row: TableRow, header: string): boolean {
  const value = row.values.get(header);
  if (value !== "כן" && value !== "לא") fail(row, header, 'נדרש "כן" או "לא"');
  return value === "כן";
}
