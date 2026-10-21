import { ExcelImportError } from "./excel-cells";
import type { CatalogRow } from "@/server/adapters/files/schemas";

export function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

// Exactly one catalog vehicle must match; zero or several is an import error, never a guess.
export function findVehicle(catalog: readonly CatalogRow[], commercialName: string, registrationYear?: number): CatalogRow {
  const matches = catalog.filter(
    (vehicle) =>
      vehicle.commercialName === commercialName &&
      (registrationYear === undefined || vehicle.key.registrationYear === registrationYear),
  );
  const label = registrationYear === undefined ? commercialName : `${commercialName} (${registrationYear})`;
  if (matches.length === 0) throw new ExcelImportError(`רכב לא נמצא בקטלוג: ${label}`);
  if (matches.length > 1) throw new ExcelImportError(`יותר מרכב אחד בקטלוג תואם ל: ${label}`);
  return matches[0];
}
