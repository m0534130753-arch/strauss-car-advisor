import type { z } from "zod";

// Thrown when a data file is missing, broken or inconsistent. The server cannot work with such data,
// so this is a startup failure (ARCHITECTURE decision 5), not a business result.
export class ReferenceDataError extends Error {
  readonly file: string;

  constructor(file: string, message: string, options?: ErrorOptions) {
    super(`${file}: ${message}`, options);
    this.name = "ReferenceDataError";
    this.file = file;
  }
}

// Validates raw JSON and reports every problem with its path ("budgets.ב", "3.key.manufacturerCode").
export function parseFile<T>(file: string, schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  throw new ReferenceDataError(file, issues.join("; "));
}
