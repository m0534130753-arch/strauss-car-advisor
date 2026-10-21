import "server-only";
import type { ReferenceData } from "@/server/ports/reference-data-source";
import { checkReferences } from "./check-references";
import { convertCatalog } from "./convert-catalog";
import { convertEmployees } from "./convert-employees";
import { convertOccupations } from "./convert-occupations";
import { convertRules } from "./convert-rules";
import { CATALOG_FILE, EMPLOYEES_FILE, OCCUPATIONS_FILE, RULES_FILE } from "./file-names";
import { readJsonFile } from "./read-json-file";

// Reads and validates every data file. Any problem throws a ReferenceDataError that names the file and the field.
export async function loadReferenceData(dataDir: string): Promise<ReferenceData> {
  const data: ReferenceData = {
    rules: convertRules(await readJsonFile(dataDir, RULES_FILE)),
    catalog: convertCatalog(await readJsonFile(dataDir, CATALOG_FILE)),
    occupations: convertOccupations(await readJsonFile(dataDir, OCCUPATIONS_FILE)),
    sampleEmployees: convertEmployees(await readJsonFile(dataDir, EMPLOYEES_FILE)),
  };
  checkReferences(data);
  return data;
}
