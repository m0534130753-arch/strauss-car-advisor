import type { Vehicle } from "@/server/domain/model";
import { CATALOG_FILE } from "./file-names";
import { parseFile } from "./reference-data-error";
import { CatalogFileSchema } from "./schemas";

export function convertCatalog(raw: unknown): Vehicle[] {
  return parseFile(CATALOG_FILE, CatalogFileSchema, raw).map((row) => ({
    id: row.id,
    group: row.group,
    manufacturerName: row.manufacturerName,
    commercialName: row.commercialName,
    modelDescription: row.modelDescription,
    key: {
      registrationYear: row.key.registrationYear,
      manufacturerCode: row.key.manufacturerCode,
      modelCode: row.key.modelCode,
    },
    propulsion: row.propulsion,
    listPrice: row.listPrice,
    catalogUsageValue: row.catalogUsageValue,
    monthlyCost: row.monthlyCost,
    defaultParticipation: row.defaultParticipation,
  }));
}
