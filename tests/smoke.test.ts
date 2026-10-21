import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Stage 0 smoke test: the test runner works and the rules file is in place.
// Real rules validation (zod) is built in Stage 1.
describe("project scaffold", () => {
  it("has the original Strauss rules file with all four group budgets", () => {
    const raw = readFileSync(path.join(__dirname, "..", "data", "strauss-rules.json"), "utf8");
    const rules = JSON.parse(raw);
    expect(rules.budgets).toEqual({ "א": 3500, "ב": 3700, "ג": 4500, "ד": 5200 });
    expect(rules.valueOfUse.driveField["3"]).toBe("חשמלי");
  });
});
