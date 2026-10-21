import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { buildDatasets, readWorkbook, serializeDataset } from "./lib/build-datasets";
import { ExcelImportError } from "./lib/excel-cells";

// Excel -> data/*.json (ARCHITECTURE decision 15). The workbook is never read at runtime.
const ROOT = path.resolve(__dirname, "..");
const DataFolder = path.join(ROOT, "data");
const RulesSchema = z.object({ valueOfUse: z.object({ driveField: z.record(z.string(), z.string()) }) });

async function main(): Promise<void> {
  const rules = RulesSchema.parse(JSON.parse(readFileSync(path.join(DataFolder, "strauss-rules.json"), "utf8")));
  const workbook = await readWorkbook(path.join(DataFolder, "source", "strauss-challenge-data.xlsx"));
  const datasets = buildDatasets(workbook, rules.valueOfUse.driveField);

  const outputs = [
    ["catalog.json", datasets.catalog],
    ["occupations.json", datasets.occupations],
    ["sample-employees.json", datasets.employees],
    ["reference-results.json", datasets.reference],
  ] as const;
  for (const [file, data] of outputs) {
    writeFileSync(path.join(DataFolder, file), serializeDataset(data), "utf8");
    process.stdout.write(`${file}: ${data.length} rows\n`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof ExcelImportError) {
    process.stderr.write(`Import failed: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
});
