import type { ElectricRules } from "@/server/domain/model";
import type { ReasonCode } from "@/server/domain/eligibility";

// Every Hebrew sentence the server writes lives here (CLAUDE.md). The sheet's wording is kept word for word
// (ARCHITECTURE decision 23); the rest follows its style. Numbers are rounded to a whole shekel here, for display only.

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

export function formatNumber(value: number): string {
  return Math.round(value).toString().replace(THOUSANDS, ",");
}

const shekel = (value: number): string => `${formatNumber(value)} ₪`;
const fromTo = (from: number, to: number): string => `${formatNumber(from)} → ${shekel(to)}`;

export type ReasonContext = {
  children?: number; // only the family track writes it
  minChildren: number;
  gapSplitEmployee: number; // 0.5 means the employee pays half of the gap
};

export const he = {
  separator: " · ",
  reasonSeparator: "; ",

  change: {
    usageValue: (from: number, to: number) => `שווי שימוש ${fromTo(from, to)}`,
    carToWaiver: (usageValue: number, maintenance: number) =>
      `בוטל שווי שימוש ${shekel(usageValue)}, נוספה אחזקה ${shekel(maintenance)} (חייבת במס)`,
    waiverToCar: (usageValue: number, maintenance: number) =>
      `נוסף שווי שימוש ${shekel(usageValue)} ובוטלה אחזקה ${shekel(maintenance)}`,
    electricAdded: (netBonus: number, method: ElectricRules["method"]) =>
      method === "gross_up" ? `+${shekel(netBonus)} נטו החזר חשמל (מגולם)` : `+${shekel(netBonus)} החזר חשמל`,
    electricRemoved: (netBonus: number, method: ElectricRules["method"]) =>
      method === "gross_up" ? `בוטל החזר חשמל ${shekel(netBonus)} נטו` : `בוטל החזר חשמל ${shekel(netBonus)}`,
    participation: (from: number, to: number) => `השתתפות ${fromTo(from, to)}`,
    familyGap: (from: number, to: number) => {
      const label = "חלק העובד בפער המסלול המשפחתי";
      if (from === 0) return `${label} ${shekel(to)}`;
      if (to === 0) return `בוטל ${label} ${shekel(from)}`;
      return `${label} ${fromTo(from, to)}`;
    },
  },

  reason: {
    SAME_AS_CURRENT: () => "זהו ההסדר הנוכחי שלך",
    NOT_IN_CATALOG: () => "הרכב לא נמצא בקטלוג החברה",
    GROUP_TOO_HIGH: () => "הרכב מקבוצה גבוהה מהקבוצה שלך",
    COST_EXCEEDS_BUDGET: () => "עלות הרכב עולה על התקציב של הקבוצה שלך",
    OWN_OR_LOWER_GROUP: () => "הרכב מהקבוצה שלך או נמוכה ממנה",
    // The electric bonus is explained by the conclusion, so the reason column leaves it out
    ELECTRIC_BONUS: () => "רכב חשמלי זכאי להחזר חשמל",
    FAMILY_TRACK: (context: ReasonContext) => {
      const children = context.children === undefined ? "" : ` (${formatNumber(context.children)} ילדים)`;
      return `מסלול ברוכת ילדים${children}; על הפער מעל התקציב - ${formatNumber(context.gapSplitEmployee * 100)}% עובד`;
    },
    FAMILY_TRACK_NOT_ENOUGH_CHILDREN: (context: ReasonContext) =>
      `מסלול ברוכת ילדים דורש לפחות ${formatNumber(context.minChildren)} ילדים`,
    WAIVER_BLOCKED_CAR_REQUIRED: () => "הרכב נדרש בתפקיד שלך, ולכן אי אפשר לוותר עליו",
    WAIVER_NOT_ALLOWED: () => "העיסוק שלך לא מאפשר ויתור על רכב",
    WAIVER_ALLOWED: () => "העיסוק מאפשר ויתור",
  } satisfies Record<ReasonCode, (context: ReasonContext) => string>,
};
