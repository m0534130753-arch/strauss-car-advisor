import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildDatasets, readWorkbook, serializeDataset } from "../../scripts/lib/build-datasets";

const ROOT = path.join(__dirname, "..", "..");
const XLSX_PATH = path.join(ROOT, "data", "source", "strauss-challenge-data.xlsx");
const RULES_PATH = path.join(ROOT, "data", "strauss-rules.json");

const driveField: Record<string, string> = JSON.parse(readFileSync(RULES_PATH, "utf8")).valueOfUse.driveField;

async function build() {
  return buildDatasets(await readWorkbook(XLSX_PATH), driveField);
}

describe("excel import: counts and shapes", () => {
  it("produces 20 vehicles, 14 occupations, 6 employees and 6 reference rows", async () => {
    const d = await build();
    expect(d.catalog).toHaveLength(20);
    expect(d.occupations).toHaveLength(14);
    expect(d.employees).toHaveLength(6);
    expect(d.reference).toHaveLength(6);
  });

  it("keeps Hebrew group letters, including the family track", async () => {
    const d = await build();
    const groups = new Set(d.catalog.map((v) => v.group));
    expect([...groups].sort()).toEqual(["א", "ב", "ד", "ג", "משפחתי"].sort());
    expect(d.catalog.filter((v) => v.group === "משפחתי").map((v) => v.id)).toEqual(["CAR-19", "CAR-20"]);
  });

  it("keeps registry codes as strings with leading zeros", async () => {
    const d = await build();
    for (const v of d.catalog) {
      expect(v.key.manufacturerCode).toMatch(/^\d{5}$/);
      expect(v.key.modelCode).toMatch(/^\d{5}$/);
    }
    const picanto = d.catalog.find((v) => v.id === "CAR-01");
    expect(picanto?.key.manufacturerCode).toBe("00885");
    const atto3 = d.catalog.find((v) => v.id === "CAR-10");
    expect(atto3?.commercialName).toBe("ATTO 3");
    expect(atto3?.key).toEqual({ registrationYear: 2025, manufacturerCode: "01014", modelCode: "00003" });
  });

  it("maps propulsion through the rules file driveField", async () => {
    const d = await build();
    const byId = (id: string) => d.catalog.find((v) => v.id === id)?.propulsion;
    expect(byId("CAR-01")).toBe("petrol");
    expect(byId("CAR-02")).toBe("hybrid");
    expect(byId("CAR-16")).toBe("plugin");
    expect(byId("CAR-03")).toBe("electric");
  });

  it("converts yes/no to booleans and zeroes maintenance when waiver is not allowed", async () => {
    const d = await build();
    const field = d.occupations.find((o) => o.name === "נציג/ת מכירות שטח");
    expect(field?.carRequired).toBe(true);
    expect(field?.waiverAllowed).toBe(false);
    expect(field?.maintenanceAmount).toBe(0);
    for (const o of d.occupations) {
      expect(typeof o.carRequired).toBe("boolean");
      expect(typeof o.waiverAllowed).toBe("boolean");
      if (!o.waiverAllowed) expect(o.maintenanceAmount).toBe(0);
    }
  });
});

describe("excel import: employees", () => {
  it("never writes an ID number", async () => {
    const d = await build();
    for (const e of d.employees) {
      expect(Object.keys(e)).not.toContain("nationalId");
      expect(Object.keys(e).join(",")).not.toMatch(/id.?number|ת.?ז/i);
    }
    for (const dataset of [d.catalog, d.occupations, d.employees, d.reference]) {
      expect(serializeDataset(dataset)).not.toMatch(/\b\d{9}\b/);
    }
  });

  it("resolves occupation and current car to ids", async () => {
    const d = await build();
    const noa = d.employees.find((e) => e.id === "E-001");
    expect(noa?.name).toBe("נועה לוי");
    expect(noa?.profile.baseSalary).toBe(18500);
    expect(noa?.profile.pensionRate).toBe(6);
    expect(noa?.profile.studyFundRate).toBe(2.5);
    expect(noa?.profile.creditPoints).toBe(2.75);
    expect(noa?.profile.childrenUnder23).toBe(2);
    const car = d.catalog.find((v) => v.commercialName === "COROLLA CROSS");
    expect(noa?.currentArrangement).toEqual({ kind: "company_car", vehicleId: car?.id, participation: 300 });

    const rachel = d.employees.find((e) => e.id === "E-003");
    expect(rachel?.currentArrangement).toEqual({ kind: "waiver" });
  });
});

describe("excel import: reference results", () => {
  it("keeps the sheet values for Noa (E-001)", async () => {
    const d = await build();
    const r = d.reference.find((x) => x.employeeId === "E-001");
    expect(r?.eligible).toBe(true);
    expect(r?.netToday).toBe(11032);
    expect(r?.netAlternative).toBe(11693);
    expect(r?.difference).toBe(661);
    expect(r?.electricGrossRefund).toBe(440);
    const atto3 = d.catalog.find((v) => v.commercialName === "ATTO 3");
    expect(r?.alternative).toEqual({ kind: "company_car", vehicleId: atto3?.id });
  });

  it("keeps the family gap for David (E-002) and waiver arrangements", async () => {
    const d = await build();
    expect(d.reference.find((x) => x.employeeId === "E-002")?.familyEmployeeShare).toBe(1150);
    expect(d.reference.find((x) => x.employeeId === "E-003")?.today).toEqual({ kind: "waiver", maintenanceAmount: 1500 });
    expect(d.reference.find((x) => x.employeeId === "E-005")?.alternative).toEqual({ kind: "waiver", maintenanceAmount: 2000 });
  });

  it("keeps the original reason and conclusion text word for word", async () => {
    const d = await build();
    const r = d.reference.find((x) => x.employeeId === "E-001");
    expect(r?.reason).toBe("הרכב מהקבוצה שלך או נמוכה ממנה");
    expect(r?.conclusion).toBe("שווי שימוש 4,070 → 3,130 ₪ · +250 ₪ נטו החזר חשמל (מגולם)");
  });
});

describe("excel import: determinism", () => {
  it("serializes identically on repeated runs", async () => {
    const a = await build();
    const b = await build();
    for (const key of ["catalog", "occupations", "employees", "reference"] as const) {
      expect(serializeDataset(a[key])).toBe(serializeDataset(b[key]));
    }
  });

  it("matches the committed data files", async () => {
    const d = await build();
    const files = {
      catalog: "catalog.json",
      occupations: "occupations.json",
      employees: "sample-employees.json",
      reference: "reference-results.json",
    } as const;
    for (const [key, file] of Object.entries(files)) {
      // git on Windows may check files out with CRLF; the content is what matters
      const committed = readFileSync(path.join(ROOT, "data", file), "utf8").replace(/\r\n/g, "\n");
      expect(committed).toBe(serializeDataset(d[key as keyof typeof files]));
    }
  });
});

describe("excel import: failures are explicit", () => {
  it("fails on a missing header, naming sheet and column", async () => {
    const wb = await readWorkbook(XLSX_PATH);
    wb.getWorksheet("קטלוג רכבים")!.getRow(1).getCell(4).value = "קוד תוצר שגוי";
    expect(() => buildDatasets(wb, driveField)).toThrow(/קטלוג רכבים.*קוד תוצר/);
  });

  it("fails when a reference car is not in the catalog", async () => {
    const wb = await readWorkbook(XLSX_PATH);
    wb.getWorksheet("חישובים")!.getRow(2).getCell(4).value = "NO SUCH CAR (2025)";
    expect(() => buildDatasets(wb, driveField)).toThrow(/NO SUCH CAR/);
  });

  it("fails on an unknown propulsion value", async () => {
    const wb = await readWorkbook(XLSX_PATH);
    wb.getWorksheet("קטלוג רכבים")!.getRow(2).getCell(9).value = "קיטור";
    expect(() => buildDatasets(wb, driveField)).toThrow(/קיטור/);
  });

  it("fails when a registry code arrives as a number (would lose leading zeros)", async () => {
    const wb = await readWorkbook(XLSX_PATH);
    wb.getWorksheet("קטלוג רכבים")!.getRow(2).getCell(4).value = 885;
    expect(() => buildDatasets(wb, driveField)).toThrow(/קוד תוצר/);
  });
});
