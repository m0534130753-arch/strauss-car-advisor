import { afterEach, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { convertRules } from "@/server/adapters/files/convert-rules";
import { FilesReferenceDataSource } from "@/server/adapters/files/files-reference-data-source";
import { ReferenceDataError } from "@/server/adapters/files/reference-data-error";

const DATA = path.join(__dirname, "..", "..", "data");
const REAL_RULES: unknown = JSON.parse(readFileSync(path.join(DATA, "strauss-rules.json"), "utf8"));

// Edits by dotted path ("budgets.ב", "netMethod.brackets.6.0"), so tests can break one thing without `any`.
type Node = Record<string, unknown>;

function parentOf(root: unknown, dotted: string): [Node, string] {
  const keys = dotted.split(".");
  let node = root as Node;
  for (const key of keys.slice(0, -1)) node = node[key] as Node;
  return [node, keys[keys.length - 1]];
}

function setPath(root: unknown, dotted: string, value: unknown): void {
  const [parent, key] = parentOf(root, dotted);
  parent[key] = value;
}

function deletePath(root: unknown, dotted: string): void {
  const [parent, key] = parentOf(root, dotted);
  delete parent[key];
}

function pushPath(root: unknown, dotted: string, value: unknown): void {
  const [parent, key] = parentOf(root, dotted);
  (parent[key] as unknown[]).push(value);
}

function brokenRules(mutate: (rules: unknown) => void): unknown {
  const copy = structuredClone(REAL_RULES);
  mutate(copy);
  return copy;
}

describe("loading the real data files", () => {
  it("loads rules, catalog, occupations and sample employees", async () => {
    const data = await new FilesReferenceDataSource(DATA).load();
    expect(data.rules.budgets).toEqual({ "א": 3500, "ב": 3700, "ג": 4500, "ד": 5200 });
    expect(data.rules.groupOrder).toEqual(["א", "ב", "ג", "ד"]);
    expect(data.rules.electric).toEqual({ netBonus: 250, method: "gross_up" });
    expect(data.rules.familyTrack).toEqual({ minChildren: 4, childMaxAge: 23, cars: ["CAR-19", "CAR-20"], gapSplitEmployee: 0.5 });
    expect(data.rules.netMethod.brackets.at(-1)).toEqual([null, 0.5]);
    expect(data.catalog).toHaveLength(20);
    expect(data.occupations).toHaveLength(14);
    expect(data.sampleEmployees).toHaveLength(6);
  });

  it("keeps the catalog key without tax year and vehicle type", async () => {
    const data = await new FilesReferenceDataSource(DATA).load();
    const atto3 = data.catalog.find((vehicle) => vehicle.id === "CAR-10");
    expect(atto3?.key).toEqual({ registrationYear: 2025, manufacturerCode: "01014", modelCode: "00003" });
    expect(atto3?.propulsion).toBe("electric");
  });

  it("converts a sample employee into confirmed demo fields and a catalog arrangement", async () => {
    const data = await new FilesReferenceDataSource(DATA).load();
    const noa = data.sampleEmployees.find((employee) => employee.id === "E-001");
    expect(noa?.profile.baseSalary).toEqual({ value: 18500, source: "demo", confirmed: true });
    expect(noa?.profile.occupationId?.confirmed).toBe(true);
    expect(noa?.currentArrangement).toEqual({
      kind: "company_car",
      vehicle: { kind: "catalog", vehicleId: "CAR-09" },
      participation: { value: 300, source: "demo", confirmed: true },
    });
    const rachel = data.sampleEmployees.find((employee) => employee.id === "E-003");
    expect(rachel?.currentArrangement).toEqual({ kind: "waiver" });
  });

  it("loads once and returns the same data on every call", async () => {
    const source = new FilesReferenceDataSource(DATA);
    expect(await source.load()).toBe(await source.load());
  });
});

describe("a broken rules file gives a clear error", () => {
  it("names the file and the path when a budget is missing", () => {
    const rules = brokenRules((r) => deletePath(r, "budgets.ב"));
    expect(() => convertRules(rules)).toThrow(ReferenceDataError);
    expect(() => convertRules(rules)).toThrow(/strauss-rules\.json.*budgets\.ב/);
  });

  it("rejects a budget that is not a number", () => {
    expect(() => convertRules(brokenRules((r) => setPath(r, "budgets.ג", "4500")))).toThrow(/budgets\.ג/);
  });

  it("rejects an unknown group letter", () => {
    expect(() => convertRules(brokenRules((r) => setPath(r, "groupOrder", ["א", "ב", "ג", "ה"])))).toThrow(/groupOrder/);
  });

  it("rejects a group order that repeats a group", () => {
    expect(() => convertRules(brokenRules((r) => setPath(r, "groupOrder", ["א", "ב", "ב", "ד"])))).toThrow(/groupOrder/);
  });

  it("rejects tax brackets that do not ascend", () => {
    const reversed = brokenRules((r) => setPath(r, "netMethod.brackets.0.0", 99999));
    expect(() => convertRules(reversed)).toThrow(/netMethod\.brackets/);
  });

  it("rejects a last bracket that has a ceiling", () => {
    expect(() => convertRules(brokenRules((r) => setPath(r, "netMethod.brackets.6.0", 99999)))).toThrow(
      /netMethod\.brackets/,
    );
  });

  it("rejects a rule the engine does not support", () => {
    expect(() => convertRules(brokenRules((r) => setPath(r, "netMethod.participation.reducesValueOfUse", true)))).toThrow(
      /reducesValueOfUse/,
    );
  });

  it("rejects a missing drive field label", () => {
    expect(() => convertRules(brokenRules((r) => deletePath(r, "valueOfUse.driveField.2")))).toThrow(/driveField/);
  });

  it("accepts extra descriptive fields, since the pilot file may add some", () => {
    const rules = brokenRules((r) => setPath(r, "somethingNew", { note: "x" }));
    expect(convertRules(rules).budgets["א"]).toBe(3500);
  });
});

describe("a broken data folder gives a clear error", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  });

  // A temporary copy of the data files that a test can break
  function copyOfData(mutate: (folder: string) => void): string {
    const folder = mkdtempSync(path.join(tmpdir(), "strauss-data-"));
    folders.push(folder);
    for (const file of ["strauss-rules.json", "catalog.json", "occupations.json", "sample-employees.json"]) {
      cpSync(path.join(DATA, file), path.join(folder, file));
    }
    mutate(folder);
    return folder;
  }

  function editJson(folder: string, file: string, edit: (data: unknown) => void): void {
    const target = path.join(folder, file);
    const data: unknown = JSON.parse(readFileSync(target, "utf8"));
    edit(data);
    writeFileSync(target, JSON.stringify(data), "utf8");
  }

  const loadFrom = (folder: string) => new FilesReferenceDataSource(folder).load();

  it("names the file when it is missing", async () => {
    const folder = copyOfData((f) => rmSync(path.join(f, "occupations.json")));
    await expect(loadFrom(folder)).rejects.toThrow(/occupations\.json.*cannot be read/);
  });

  it("names the file when it is not valid JSON", async () => {
    const folder = copyOfData((f) => writeFileSync(path.join(f, "catalog.json"), "{ not json", "utf8"));
    await expect(loadFrom(folder)).rejects.toThrow(/catalog\.json.*not valid JSON/);
  });

  it("names the row and the field of a bad catalog entry", async () => {
    const folder = copyOfData((f) => editJson(f, "catalog.json", (rows) => setPath(rows, "3.key.manufacturerCode", 885)));
    await expect(loadFrom(folder)).rejects.toThrow(/catalog\.json.*3\.key\.manufacturerCode/);
  });

  it("rejects a family track car that is not in the catalog", async () => {
    const folder = copyOfData((f) => editJson(f, "strauss-rules.json", (rules) => pushPath(rules, "familyTrack.cars", "CAR-99")));
    await expect(loadFrom(folder)).rejects.toThrow(/familyTrack\.cars.*CAR-99/);
  });

  it("rejects a family track car that is not in the family group", async () => {
    const folder = copyOfData((f) => editJson(f, "strauss-rules.json", (rules) => pushPath(rules, "familyTrack.cars", "CAR-01")));
    await expect(loadFrom(folder)).rejects.toThrow(/familyTrack\.cars.*CAR-01/);
  });

  it("rejects a family-group car that is missing from the family track", async () => {
    const folder = copyOfData((f) => editJson(f, "strauss-rules.json", (rules) => setPath(rules, "familyTrack.cars", ["CAR-19"])));
    await expect(loadFrom(folder)).rejects.toThrow(/familyTrack\.cars.*CAR-20/);
  });

  it("rejects a sample employee whose occupation is unknown", async () => {
    const folder = copyOfData((f) => editJson(f, "sample-employees.json", (rows) => setPath(rows, "0.occupationId", "OCC-99")));
    await expect(loadFrom(folder)).rejects.toThrow(/sample-employees\.json.*OCC-99/);
  });

  it("rejects a sample employee whose car is not in the catalog", async () => {
    const folder = copyOfData((f) =>
      editJson(f, "sample-employees.json", (rows) => setPath(rows, "0.currentArrangement.vehicleId", "CAR-99")),
    );
    await expect(loadFrom(folder)).rejects.toThrow(/sample-employees\.json.*CAR-99/);
  });

  it("rejects a budget group that the group order does not list", async () => {
    const folder = copyOfData((f) => editJson(f, "strauss-rules.json", (rules) => setPath(rules, "groupOrder", ["א", "ב", "ג"])));
    await expect(loadFrom(folder)).rejects.toThrow(/groupOrder/);
  });
});
