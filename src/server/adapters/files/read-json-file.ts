import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ReferenceDataError } from "./reference-data-error";

export async function readJsonFile(dataDir: string, file: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path.join(dataDir, file), "utf8");
  } catch (cause) {
    throw new ReferenceDataError(file, "cannot be read", { cause });
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ReferenceDataError(file, "is not valid JSON", { cause });
  }
}
