import { describe, expect, it } from "vitest";
import type { Change } from "@/server/domain/comparison";
import type { ReasonCode } from "@/server/domain/eligibility";
import { describeChanges } from "@/server/i18n/describe-changes";
import { describeReasons } from "@/server/i18n/describe-reasons";
import { formatNumber } from "@/server/i18n/he";

// Wording that the sheet does not cover: the same style, checked here. Sheet wording is checked in reference-texts.test.ts.
const context = { children: 5, minChildren: 4, gapSplitEmployee: 0.5 };

describe("formatNumber", () => {
  it("groups thousands with commas, whatever the machine's locale", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("rounds to a whole shekel for display only, and keeps the sign", () => {
    expect(formatNumber(1938.68)).toBe("1,939");
    expect(formatNumber(-1938.4)).toBe("-1,938");
    expect(formatNumber(-0.2)).toBe("0");
  });
});

describe("describeChanges", () => {
  it("writes nothing for no changes", () => {
    expect(describeChanges([])).toBe("");
  });

  it("joins changes with a middle dot", () => {
    const changes: Change[] = [
      { kind: "usage_value", from: 4070, to: 3130 },
      { kind: "participation", from: 400, to: 300 },
    ];
    expect(describeChanges(changes)).toBe("שווי שימוש 4,070 → 3,130 ₪ · השתתפות 400 → 300 ₪");
  });

  it("writes the electric bonus by the method of the rules", () => {
    expect(describeChanges([{ kind: "electric_bonus_added", netBonus: 250, method: "gross_up" }])).toBe("+250 ₪ נטו החזר חשמל (מגולם)");
    expect(describeChanges([{ kind: "electric_bonus_added", netBonus: 250, method: "gross" }])).toBe("+250 ₪ החזר חשמל");
    expect(describeChanges([{ kind: "electric_bonus_removed", netBonus: 250, method: "gross_up" }])).toBe("בוטל החזר חשמל 250 ₪ נטו");
    expect(describeChanges([{ kind: "electric_bonus_removed", netBonus: 250, method: "gross" }])).toBe("בוטל החזר חשמל 250 ₪");
  });

  it("writes the family gap when it appears, changes or disappears", () => {
    expect(describeChanges([{ kind: "family_gap", from: 0, to: 1150 }])).toBe("חלק העובד בפער המסלול המשפחתי 1,150 ₪");
    expect(describeChanges([{ kind: "family_gap", from: 1150, to: 900 }])).toBe("חלק העובד בפער המסלול המשפחתי 1,150 → 900 ₪");
    expect(describeChanges([{ kind: "family_gap", from: 1150, to: 0 }])).toBe("בוטל חלק העובד בפער המסלול המשפחתי 1,150 ₪");
  });
});

describe("describeReasons", () => {
  it("has a sentence for every reason code", () => {
    const codes: ReasonCode[] = [
      "SAME_AS_CURRENT",
      "NOT_IN_CATALOG",
      "GROUP_TOO_HIGH",
      "COST_EXCEEDS_BUDGET",
      "OWN_OR_LOWER_GROUP",
      "FAMILY_TRACK",
      "FAMILY_TRACK_NOT_ENOUGH_CHILDREN",
      "WAIVER_BLOCKED_CAR_REQUIRED",
      "WAIVER_NOT_ALLOWED",
      "WAIVER_ALLOWED",
    ];
    for (const code of codes) expect(describeReasons([code], context)).not.toBe("");
  });

  it("uses the agreed wording", () => {
    expect(describeReasons(["NOT_IN_CATALOG"], context)).toBe("הרכב לא נמצא בקטלוג החברה");
    expect(describeReasons(["GROUP_TOO_HIGH"], context)).toBe("הרכב מקבוצה גבוהה מהקבוצה שלך");
    expect(describeReasons(["COST_EXCEEDS_BUDGET"], context)).toBe("עלות הרכב עולה על התקציב של הקבוצה שלך");
    expect(describeReasons(["FAMILY_TRACK_NOT_ENOUGH_CHILDREN"], context)).toBe("מסלול ברוכת ילדים דורש לפחות 4 ילדים");
    expect(describeReasons(["WAIVER_BLOCKED_CAR_REQUIRED"], context)).toBe("הרכב נדרש בתפקיד שלך, ולכן אי אפשר לוותר עליו");
    expect(describeReasons(["WAIVER_NOT_ALLOWED"], context)).toBe("העיסוק שלך לא מאפשר ויתור על רכב");
    expect(describeReasons(["SAME_AS_CURRENT"], context)).toBe("זהו ההסדר הנוכחי שלך");
  });

  it("joins several reasons with a semicolon, and leaves the electric bonus to the conclusion", () => {
    expect(describeReasons(["GROUP_TOO_HIGH", "COST_EXCEEDS_BUDGET"], context)).toBe(
      "הרכב מקבוצה גבוהה מהקבוצה שלך; עלות הרכב עולה על התקציב של הקבוצה שלך",
    );
    expect(describeReasons(["OWN_OR_LOWER_GROUP", "ELECTRIC_BONUS"], context)).toBe("הרכב מהקבוצה שלך או נמוכה ממנה");
  });

  it("writes the family track with the number of children, or without it when unknown", () => {
    expect(describeReasons(["FAMILY_TRACK"], context)).toBe("מסלול ברוכת ילדים (5 ילדים); על הפער מעל התקציב - 50% עובד");
    expect(describeReasons(["FAMILY_TRACK"], { ...context, children: undefined })).toBe(
      "מסלול ברוכת ילדים; על הפער מעל התקציב - 50% עובד",
    );
  });
});
