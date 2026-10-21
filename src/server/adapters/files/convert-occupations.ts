import type { Occupation } from "@/server/domain/model";
import { OCCUPATIONS_FILE } from "./file-names";
import { parseFile } from "./reference-data-error";
import { OccupationsFileSchema } from "./schemas";

export function convertOccupations(raw: unknown): Occupation[] {
  return parseFile(OCCUPATIONS_FILE, OccupationsFileSchema, raw).map((row) => ({
    id: row.id,
    name: row.name,
    group: row.group,
    carRequired: row.carRequired,
    waiverAllowed: row.waiverAllowed,
    maintenanceAmount: row.maintenanceAmount,
  }));
}
