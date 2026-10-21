import "server-only";
import type { ReferenceData, ReferenceDataSource } from "@/server/ports/reference-data-source";
import { loadReferenceData } from "./load-reference-data";

// Demo adapter: rules and reference data from JSON files. Loaded once; a failed load can be retried.
export class FilesReferenceDataSource implements ReferenceDataSource {
  private readonly dataDir: string;
  private loading: Promise<ReferenceData> | undefined;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  load(): Promise<ReferenceData> {
    this.loading ??= loadReferenceData(this.dataDir).catch((error: unknown) => {
      this.loading = undefined;
      throw error;
    });
    return this.loading;
  }
}
