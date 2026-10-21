# יועץ הרכב של שטראוס: מסמך ארכיטקטורה

> **מקור האמת לתכנון.** כל החלטה כאן התקבלה בתהליך אפיון מסודר. אם הקוד צריך לסטות ממנה, קודם מעדכנים את המסמך (עם נימוק), ורק אז את הקוד.
>
> גרסה: 1.0 · 21.10.2026 · כללים: `mock-2026-10-12`

## תוכן

0. [תקציר](#0-תקציר)
1. [טכנולוגיות](#1-טכנולוגיות)
2. [שכבות וזרימת בקשה](#2-שכבות-וזרימת-בקשה)
3. [שלב א: גבולות ותכולה (החלטות 1-3)](#3-שלב-א-גבולות-ותכולה)
4. [שלב ב: הליבה העסקית (החלטות 4-7)](#4-שלב-ב-הליבה-העסקית)
5. [שלב ג: הבוט (החלטות 8-12)](#5-שלב-ג-הבוט)
6. [שלב ד: גמישות (החלטה 13)](#6-שלב-ד-גמישות)
7. [שלב ה: נתונים (החלטות 14-16)](#7-שלב-ה-נתונים)
8. [שלב ו: נציג וזמן אמת (החלטה 17)](#8-שלב-ו-נציג-וזמן-אמת)
9. [שלב ז: אבטחה (החלטות 18-20)](#9-שלב-ז-אבטחה)
10. [שלב ח: חוזים ומבנה (החלטות 21-23)](#10-שלב-ח-חוזים-ומבנה)
11. [שלב ט: איכות והגשה (החלטות 24-27)](#11-שלב-ט-איכות-והגשה)
12. [נתוני ייחוס מאומתים](#12-נתוני-ייחוס-מאומתים)
13. [הנחות ושאלות פתוחות](#13-הנחות-ושאלות-פתוחות)

---

## 0. תקציר

עובד שואל "מה יקרה לנטו שלי אם אעבור לרכב חשמלי / אקח רכב אחר / אוותר על הרכב?". בוט בעברית אוסף רק את מה שחסר, מנוע בקוד מחשב את הנטו לכל חלופה, וטבלת השוואה מציגה מה השתנה, למה, וכמה זה שווה בנטו. כשחסר נתון שאין לו מקור, הבוט פונה לנציג אנושי, והשיחה ממשיכה מאותה נקודה כשהנציג עונה.

**שלושה עקרונות שאין עליהם ויתור:**
1. **כל מספר מגיע מהמנוע**, שאומת מול 12 ערכי הייחוס של שטראוס. המודל רק מנהל שיחה ומסביר.
2. **לא מנחשים.** נתון חסר: שואלים את העובד, או פונים לנציג, ואומרים את זה.
3. **מחליפים קבצים ומתאמים, לא קוד.** כללים, קטלוג, ספק AI ומקור נתונים ניתנים להחלפה בלי לגעת בליבה.

---

## 1. טכנולוגיות

| שכבה | בחירה | נימוק |
|---|---|---|
| שפה | TypeScript | שפה אחת לממשק, לשרת ולמנוע. טיפוסים מונעים טעויות בעשרות השדות הכספיים |
| מסגרת | Next.js 16 (App Router) על Node.js 22 | ממשק ושרת באותו פרויקט. **שימו לב: Next 16 שונה מהמוכר, ראו `AGENTS.md`** |
| AI | Vercel AI SDK 7 | לולאת כלים, streaming, `useChat`, `generateObject`, ספקים מתחלפים |
| מודל | Gemini 2.5 Flash (ראשי), Flash-Lite (גיבוי), מודל דרך OpenRouter (גיבוי שני) | עברית טובה, function calling, ראייה לתלוש, מכסה חינמית |
| סכימות | zod 4 | בדיקת קלט, טיפוסים, הגדרות כלים, חוזים |
| מסד נתונים | Supabase (PostgreSQL), דרך Drizzle ORM + postgres.js | רלציוני, טרנזקציות, migrations בקוד |
| זמן אמת ואחסון | Supabase Realtime Broadcast, Supabase Storage (דרך supabase-js) | "פעמון" לעדכונים, אחסון פרטי לתלוש |
| עיצוב | Tailwind 4 + shadcn/ui | RTL, רכיבים מוכנים |
| בדיקות | Vitest, Playwright, MockLanguageModel של AI SDK | |
| אירוח | Vercel (אזור `fra1`), Supabase (אזור `eu-central-1`) | הקוד והמסד באותו אזור |

**מה לא בפרויקט, ולמה:** אין וקטורים ואין RAG (כל הנתונים מובנים, שליפה לפי מפתח מדויק). אין כלי no-code. אין שירות OCR נפרד (Gemini מספיק). אין Redis (מגבלת קצב ב-Postgres).

---

## 2. שכבות וזרימת בקשה

```
┌───────────────────────────────────────────────────────────────┐
│ Presentation      src/app (עמודים), src/components            │  דפדפן: מציג בלבד
├───────────────────────────────────────────────────────────────┤
│ API               src/app/api (Route Handlers)                 │  זהות, הרשאה, zod
├───────────────────────────────────────────────────────────────┤
│ Application       src/server/application                       │  תרחישי שימוש, סוכן
├───────────────────────────────────────────────────────────────┤
│ Domain            src/server/domain                            │  פונקציות טהורות
├───────────────────────────────────────────────────────────────┤
│ Ports / Adapters  src/server/ports, src/server/adapters        │  Supabase, Gemini, קבצים
└───────────────────────────────────────────────────────────────┘
          container.ts: המקום היחיד שבוחר מתאמים (לפי env)
```

**כללי תלות** (נאכפים ב-ESLint, `eslint.config.mjs`):

| תיקייה | מותר לייבא מ | אסור |
|---|---|---|
| `server/domain` | רק מעצמה | הכל, כולל zod, Next, React, ספקים |
| `server/application` | domain, ports, i18n | adapters, container, app, components, Next, ספריות מסד |
| `server/adapters` | ports, טיפוסי domain | application, app, components |
| `app` | application, security, container, contracts | adapters ישירות |
| `components` | contracts, lib, ui | כל `server` |

**זרימה לדוגמה** (נועה, ATTO 3):
```
1. העובדת בוחרת ATTO 3 (CAR-10) ברכיב בחירה בצ'אט
2. API: requireUser → authorize(conversation) → zod
3. Application (add_alternative): טוען קטלוג → מפתח 2026/2025/1/01014/00003
4. Port UsageValueSource → טבלת usage_values → 3,130
5. Domain checkEligibility → זכאית (OWN_OR_LOWER_GROUP, ELECTRIC_BONUS)
6. Domain calculateNet ×2 → היום 11,032 · חלופה 11,693
7. Application → ComparisonRowDTO (+661, מסקנה מתבנית) → נשמר בהיסטוריה כתמונת מצב
8. הסוכן מנסח תשובה מתוך תוצאת הכלי; הטבלה מתעדכנת מהמצב
```

---

## 3. שלב א: גבולות ותכולה

### החלטה 1: תכולה

**בסיס (חובה):**
- מנוע חישוב שמגיע לנטו הייחוס של ששת העובדים
- ארבע החלופות: רכב אחר, חשמלי, מסלול ברוכת ילדים, ויתור
- בדיקת זכאות עם הסבר
- שליפת שווי שימוש מהמאגר
- צ'אט בעברית שאוסף רק מה שחסר ומפעיל כלים
- פנייה לנציג, מסך נציג, המשך השיחה מאותה נקודה
- שמירת מצב אחרי רענון
- תצוגת השוואה, שינוי רכב וחישוב מחדש

**תוספות, לפי סדר עדיפות:** (1) קריאת תלוש, (2) התחברות עם Google, (3) מעבר אוטומטי לספק גיבוי (אם לא נכנס בבסיס), (4) מסך היסטוריית שיחות.

**מחוץ לתכולה (יצוין בסיכום):** התחברות ארגונית, חיבור למערכת השכר, הטבות יישוב ומקרים מיוחדים במס.

### החלטה 2: זהות

- **שלב ראשון:** כניסת הדגמה. בחירה בעובד לדוגמה, "עובד חדש" (מזהה חדש בכל כניסה), או "נציג" עם קוד גישה (`REP_ACCESS_CODE`). השרת מנפיק עוגייה חתומה (`httpOnly`, `secure`, `sameSite=lax`) עם תפקיד ומזהה עובד. **כל בדיקות ההרשאה מסתמכות רק על העוגייה**, אף פעם לא על מזהה שנשלח בגוף בקשה.
- **שלב שני (תוספת 2):** Google דרך Supabase Auth. כניסת ההדגמה נשארת מאחורי `DEMO_LOGIN_ENABLED`.
- מזהה העובד הפנימי נפרד מזהות ההתחברות (`employees.auth_user_id`). התפקיד נקבע אצלנו (טבלת `representatives`). כל הקוד ניגש לזהות דרך `getCurrentUser()` בלבד, מאחורי `IdentityProvider`.
- בחירת עובד לדוגמה קובעת זהות בלבד, לא נתונים. "מילוי מהיר" הוא כפתור נפרד.

### החלטה 3: תרחישים

| # | תרחיש | עובד לדוגמה |
|---|---|---|
| 1 | החלפה לרכב רגיל | נבדק בנפרד |
| 2 | מעבר לחשמלי | נועה, יוסי, אלי |
| 3 | מסלול ברוכת ילדים | דוד |
| 4 | ויתור | מיכל; גם מפתחת תוכנה מקבוצה ב' (נדרש במפורש) |
| 5 | מוויתור לרכב | רחל |
| 6 | חסר מידע ← נציג | נבדק בנפרד |
| 7 | בקשה לא מותרת | קבוצה גבוהה, ויתור בתפקיד שטח, משפחתי עם פחות מ-4 ילדים |
| 8 | תיקון נתונים / רכב נוסף | כולם |
| 9 | רכב נוכחי מחוץ לקטלוג | נבדק בנפרד |
| 10 | תלוש (תוספת) | כולם |
| 11 | נציג עונה, השיחה ממשיכה | |
| 12 | רענון, אצל עובד ונציג | |

**החלטות נלוות:**
- **מספר חלופות לא מוגבל**, שורה לכל חלופה, הסתרה הפיכה (כפתור או בשיחה), חלופה לא זכאית מוצגת עם סיבה.
- **השתתפות מהקטלוג היא מקור אמת.** פונים לנציג רק לנתון שאין לו מקור. חלופה שממתינה מוצגת **בלי מספר נטו**, והשיחה ושאר החלופות ממשיכות.
- **רכב חדש רק מהקטלוג.** רכב נוכחי: מהקטלוג, או חיפוש במאגר רשות המסים, או נציג.
- **בחירה מרשימה סגורה** (רכב, עיסוק) נעשית ברכיב בתוך הצ'אט ונשלחת כנתון מובנה עם מזהה.

---

## 4. שלב ב: הליבה העסקית

### החלטה 4: מודל הנתונים העסקי

```ts
type Group = 'א' | 'ב' | 'ג' | 'ד';
type CatalogGroup = Group | 'משפחתי';
type Propulsion = 'petrol' | 'hybrid' | 'plugin' | 'electric'; // 0,1,2,3 לפי rules.valueOfUse.driveField

type CatalogRegistryKey = {   // מה שיש בקטלוג (מהאקסל)
  registrationYear: number;
  manufacturerCode: string;   // מחרוזת! '00885'
  modelCode: string;          // מחרוזת! '00643'
};
type RegistryKey = CatalogRegistryKey & {  // המפתח המלא לשליפה מהמאגר
  taxYear: number;            // מהמאגר (2026)
  vehicleTypeCode: string;    // '1' כברירת מחדל לרכבי הקטלוג
};

type Vehicle = {
  id: string;                 // 'CAR-10'
  group: CatalogGroup;        // track נגזר: rules.familyTrack.cars
  manufacturerName: string;
  commercialName: string;     // 'ATTO 3'
  modelDescription: string;   // 'SC2E-SC2E01'
  key: CatalogRegistryKey;    // שכבת היישום משלימה ל-RegistryKey בשליפה מהמאגר
  propulsion: Propulsion;
  listPrice: number;
  catalogUsageValue: number;  // לבדיקה בלבד; בזמן ריצה המאגר קובע
  monthlyCost: number;
  defaultParticipation: number;
};

type Occupation = {
  id: string; name: string; group: Group;
  carRequired: boolean; waiverAllowed: boolean;
  maintenanceAmount: number;  // 0 כשאין ויתור; ההכרעה לפי waiverAllowed
};

type Source = 'employee' | 'payslip' | 'representative' | 'catalog' | 'demo';
type Field<T> = { value: T; source: Source; confirmed: boolean };

type EmployeeProfile = {
  occupationId?: Field<string>;
  baseSalary?: Field<number>;
  commissions?: Field<number>;
  bonus?: Field<number>;
  pensionRate?: Field<number>;     // אחוזים, 6 = 6%
  studyFundRate?: Field<number>;
  creditPoints?: Field<number>;
  childrenUnder23?: Field<number>; // רק למסלול המשפחתי
};

type VehicleRef =
  | { kind: 'catalog'; vehicleId: string }
  | { kind: 'tax_registry'; key: RegistryKey; usageValue: number; label: string };

type CarArrangement =
  | { kind: 'company_car'; vehicle: VehicleRef; participation?: Field<number> }
  | { kind: 'waiver' };          // סכום האחזקה מהעיסוק

type Alternative = {
  id: string;
  arrangement: CarArrangement;
  hidden: boolean;
  createdAt: string;
};
```

- **הקבוצה לא נשמרת**, היא נגזרת מהעיסוק. סתירה עם מה שהעובד אמר: שואלים פעם אחת, ואחר כך נציג.
- שדה עם `confirmed: false` (מתלוש, לפני אישור) **לא נכנס לחישוב**.
- המצב היום והחלופות משתמשים באותו `CarArrangement`.

### החלטה 5: קובץ הכללים

- `data/strauss-rules.json` נשמר **כפי שהוא, ללא שינוי** (בפיילוט מחליפים אותו).
- טוען (`adapters/files`) בודק אותו בסכימת zod וממיר לטיפוסים פנימיים. קובץ לא תקין ← השרת לא עולה, `/api/health` מציג את השגיאה.
- נקראים מהקובץ: תקציבים, `groupOrder`, `chooseFrom`, `electric.method` + `netBonus`, `familyTrack` (כולל רשימת `cars`), `waiver`, `netMethod` כולו, `valueOfUse.key` ו-`driveField`.
- פורמט JSON (לא YAML): זה מה שסופק, ו-YAML עלול להפוך `00885` למספר.

### החלטה 6: מנוע הנטו (`domain/net`)

פונקציה טהורה, הסדר אחד בכל הפעלה:

```
calculateNet(profile, inputs, rules.netMethod) → NetBreakdown
```

`inputs` = `{ usageValue, participation, maintenance, familyGapShare, electricGrossUp }`: חמישה מספרים מוכנים. המנוע לא מכיר זכאויות; שכבת היישום ממירה את `entitlements` של בודק הזכאות (החלטה 7) למספרים האלה לפני הקריאה.

| שלב | חישוב |
|---|---|
| 1 | `grossCash = בסיס + עמלות + בונוס` |
| 2 | רכיבי ההסדר (מוזנים מבחוץ): `usageValue`, `participation`, `maintenance`, `familyGapShare`, `electricGrossUp` |
| 3 | `pension = grossCash × pensionRate`; `studyFund = grossCash × studyFundRate` (**רק על grossCash**) |
| 4 | `taxable = grossCash + usageValue + maintenance + electricGrossUp` |
| 5 | `incomeTax = max(0, מדרגות(taxable) − creditPoints × 242 − 0.35 × min(pension, 0.07 × 9,500))` |
| 6 | ביטוח לאומי ובריאות, כל אחד: `min(taxable, 50,695)`, עד 7,522 בשיעור נמוך ומעליו בגבוה |
| 7 | `net = grossCash + maintenance + electricGrossUp − pension − studyFund − incomeTax − NI − health − participation − familyGapShare` |

- **שווי השימוש לא מופיע בשלב 7**, רק מגדיל את המס.
- **גילום החזר חשמל** (`method: gross_up`): חיפוש בינארי על `g ∈ [0, 3 × 250]`, 100 איטרציות, כך ש-`net(g) − net(0) = 250`. **לא פנסיוני** (אומת). `method: gross` ← `g = 250` קבוע.
- **אין עיגול באף שלב.** עיגול לשקל רק בתצוגה. **ההפרש מחושב לפני העיגול.**
- המדרגה האחרונה בקובץ היא `null` = ללא תקרה.

```ts
type NetBreakdown = {
  grossCash: number; usageValue: number; electricGrossUp: number; maintenance: number;
  taxableIncome: number; taxBeforeCredits: number; creditPointsCredit: number; pensionCredit: number;
  incomeTax: number; nationalInsurance: number; health: number;
  pensionEmployee: number; studyFundEmployee: number;
  carParticipation: number; familyGapShare: number;
  net: number;
};
```

### החלטה 7: בודק הזכאות (`domain/eligibility`)

```ts
type EligibilityStatus = 'eligible' | 'ineligible' | 'needs_data';
type Entitlements = { budget: number; electricBonus: boolean; familyGapEmployeeShare: number; maintenanceAmount: number };
type EligibilityResult =        // איחוד: זכאויות רק כשזכאי, ובלי מספרים מומצאים
  | { status: 'eligible';   reasons: ReasonCode[]; entitlements: Entitlements }
  | { status: 'ineligible'; reasons: ReasonCode[] }       // חיוביים ושליליים, כולם נאספים
  | { status: 'needs_data'; reasons: ReasonCode[]; missingFields: (keyof EmployeeProfile)[] };
```

| סוג | כללים (לפי הסדר) | סיבה חיובית |
|---|---|---|
| כל סוג | עיסוק לא ידוע ← `needs_data` · זהה להסדר הנוכחי ← `SAME_AS_CURRENT` (הערה) | |
| רכב רגיל | לא בקטלוג ← `NOT_IN_CATALOG` · קבוצה גבוהה (לפי `groupOrder`) ← `GROUP_TOO_HIGH` · עלות > תקציב ← `COST_EXCEEDS_BUDGET` (הגנה לקטלוג עתידי) | `OWN_OR_LOWER_GROUP`, ואם `electric` גם `ELECTRIC_BONUS` |
| משפחתי (`familyTrack.cars`) | ילדים לא ידוע ← `needs_data` · פחות מ-4 ← `FAMILY_TRACK_NOT_ENOUGH_CHILDREN` | `FAMILY_TRACK`; פער = `max(0, עלות − תקציב קבוצת העובד) × 0.5` |
| ויתור | `carRequired` ← `WAIVER_BLOCKED_CAR_REQUIRED` · `!waiverAllowed` ← `WAIVER_NOT_ALLOWED` | `WAIVER_ALLOWED` + סכום אחזקה |

- **"רכב חובה" חוסם ויתור בלבד**, לא מסלול משפחתי (דוד).
- **החזר חשמל רק ל-`electric`** (3), לא לפלאג-אין.
- **המצב היום לא נבדק לזכאות.**
- `checkEligibility(profile, arrangement, data, current?)` ו-`listEligibleOptions(profile, data)`, כש-`data = { catalog, occupations, rules }` (העיסוק קובע את קבוצת העובד). האחרונה מחזירה את ההסדרים הזכאים (רכבי קטלוג, וויתור אם מותר) עם הזכאויות שלהם, לרכיב הבחירה ולהצעת חלופות.
- `SAME_AS_CURRENT` הוא הערה בלבד: נוסף לסיבות, והסטטוס נקבע לפי שאר הכללים.
- תרגום קודים לעברית ב-`server/i18n/he.ts`, לא בליבה.

**זרימה לכל חלופה:**
```
checkEligibility ─┬─ ineligible  → סיבה, בלי מספר
                  ├─ needs_data  → שואלים / נציג, בלי מספר
                  └─ eligible ─┬─ חסר נתון להסדר (השתתפות) → "ממתין לנציג", בלי מספר
                               └─ הכל קיים → calculateNet → מספר + פירוט
```

---

## 5. שלב ג: הבוט

### החלטה 8: מצב השיחה

- **המצב בשרת (מסד), לא בזיכרון המודל.** המודל משנה אותו רק דרך כלים, עם בדיקת טווחים.
- **רשימת החסרים מחושבת בקוד** (`missingFields(state)`) ומועברת למודל בכל תור.
- **לא נשמרים:** תוצאות חישוב (מחושבות מחדש בכל טעינה), "שלב בשיחה" (נגזר).

```ts
type ConversationState = {
  id: string; employeeId: string; rulesVersion: string;
  profile: EmployeeProfile;
  current: CarArrangement | null;
  alternatives: Alternative[];
  status: 'active' | 'closed';
};
```

| חובה תמיד | לפי תרחיש | לא נשאל |
|---|---|---|
| עיסוק, בסיס, עמלות+בונוס (שאלה אחת, "לא" = 0), פנסיה, קרן השתלמות, נקודות זיכוי, הסדר היום | ילדים עד 23 (רק משפחתי) | קבוצה, שווי שימוש, אחזקה, תקציב |

- **השתתפות היום:** הבוט מציע את ערך הקטלוג ומבקש אישור.
- **סדר איסוף בקבוצות:** כוונה ← עיסוק + רכב היום (בחירה) ← רכיבי שכר ← הפרשות וזיכויים או תלוש.

| שדה | טווח |
|---|---|
| בסיס | 1-200,000 |
| עמלות, בונוס | 0-200,000 |
| פנסיה עובד | 0-10% |
| קרן השתלמות עובד | 0-2.5% |
| נקודות זיכוי | 0-20, קפיצות 0.25 |
| ילדים | שלם, 0-20 |

**היסטוריה:** טבלת `messages` (רק מתווספות) שומרת הכל: הודעות, בחירות, הפעלות כלים ותוצאותיהן (כתמונת מצב), אירועי נציג. למודל נשלחים: תקציר המצב + החסרים + 20 ההודעות האחרונות.

**מילוי מהיר** לעובדים לדוגמה (מקור `demo`), כבוי כברירת מחדל.

### החלטה 9: כלי הסוכן

עקרונות: מעט כלים · **הזהות לעולם לא פרמטר** · מזהים ולא טקסט · אף כלי לא מקבל ערך כספי מחושב · שגיאה = `{ ok: false, code, details }` · **כל כלי אידמפוטנטי**.

| כלי | קלט | עושה |
|---|---|---|
| `update_profile` | שדות חלקיים | בודק טווחים, שומר (מקור: העובד), מחזיר חסרים |
| `set_current_arrangement` | `company_car {vehicleId, participation?}` / `waiver` | קובע הסדר היום |
| `show_picker` | `occupation` / `current_vehicle` / `alternative_vehicle`, `filter?` | רכיב בחירה בצ'אט (רכבים זכאים בלבד) |
| `search_tax_registry` | `{ text, registrationYear }` | עד 10 התאמות, כרכיב בחירה; אין התאמה ← `suggest: ask_representative` |
| `add_alternative` | `catalog_car {vehicleId}` / `waiver` | **זכאות + שליפה + חישוב בכלי אחד**; קיים כבר ← מחזיר את הקיים |
| `set_alternative_hidden` | `{ alternativeId, hidden }` | |
| `get_comparison` | | כל ההשוואה עם פירוט |
| `ask_representative` | `{ field, question, alternativeId? }` | נושא מורשה, שדה לא ידוע, בלי כפילות |
| `extract_payslip` (תוספת) | `{ fileId }` | שדות עם `confirmed: false` |

תוצאה לדוגמה:
```json
{ "ok": true, "alternativeId": "alt_2", "status": "ready",
  "reasons": [{ "code": "OWN_OR_LOWER_GROUP", "text": "הרכב מהקבוצה שלך או נמוכה ממנה" }],
  "netToday": 11032.41, "netAlternative": 11693.27, "delta": 660.86,
  "changes": [{ "type": "usage_value", "text": "שווי שימוש 4,070 → 3,130 ₪" }] }
```

| איסור על המודל | נאכף ע"י |
|---|---|
| לחשב מספרים | פרומפט + אין כלי שמקבל תוצאה כספית |
| לקבוע זכאות | רק פלט של `add_alternative` |
| להמציא שווי שימוש | השליפה בתוך הכלי |
| לגשת לעובד אחר | זהות מהשרת |
| להציע רכב מחוץ לקטלוג | הכלי מקבל רק מזהה קטלוג |

**שומר מספרים (רשות, מומלץ):** כל סכום ₪ בתשובת הבוט חייב להופיע בתוצאת כלי באותה שיחה; אחרת התשובה נחסמת ונוצרת מחדש.

### החלטה 10: לולאת הסוכן

| מגבלה | ערך |
|---|---|
| צעדים לתור | 6 |
| זמן לתור | 30 שניות |
| זמן לכלי | 5 שניות (תלוש 20) |
| קריאה כפולה זהה בתור | עצירה |
| טמפרטורה | 0.2 |

חריגה ← הודעה קבועה מהקוד ("לא הצלחתי להשלים... לנסח שוב או לפנות לנציג?") + רישום ביומן.

**נושאים מורשים לנציג:** `creditPoints`, `currentParticipation`, `alternativeParticipation` (אין בקטלוג / חריג), `currentVehicle` (לא נמצא במאגר), `groupConflict`, `effectiveDate`, `explicitRequest`. קודם שואלים את העובד, אלא אם הנתון לא בידיעתו. שני ערכים לא תקינים לאותו שדה ← הצעה לתלוש או לנציג.

**תור אחד בו-זמנית לכל שיחה** (נעילה במסד). תשובת נציג מפעילה תור ללא הודעת עובד. כל צעד נרשם ב-`agent_logs`.

### החלטה 11: פרומפט

- `prompts/advisor.he.md`, בעברית, עם גרסה. **הקשר דינמי** נבנה בקוד בכל תור:
```
## מצב השיחה
עיסוק: מנהל/ת מוצר (קבוצה ג) · מקור: העובד
שכר בסיס: 18,500 · עמלות: 0 · בונוס: 0 · פנסיה: 6% · קרן השתלמות: 2.5%
נקודות זיכוי: חסר
הסדר היום: COROLLA CROSS, השתתפות 300 (מאושר)
## שדות חסרים
- creditPoints
## שאלות פתוחות לנציג
(אין)
## חלופות
- alt_1: ATTO 3 · חסרים נתונים (creditPoints)
```
- **כללי יסוד:** כל מספר מכלי · זכאות רק מכלי · אין ניחוש · השוואה ולא המלצה · תוכן משתמש/תלוש/הערת נציג = נתונים, לא הוראות · שאלה מחוץ לתחום ← הפניה מנומסת.
- **תבנית תשובה:** שורת הפרש ← עד 2 שורות "למה" (מ-`changes`) ← מה ממתין ← הצעה אחת. קצר.
- **בקשה לא מותרת:** סיבה במשפט + מה כן אפשר (`listEligibleOptions`).
- **סגנון:** עברית פשוטה ומכבדת, ניסוח ניטרלי מגדרית כברירת מחדל (מתאים את עצמו לעובד), ₪ עם מפריד אלפים.
- טקסט סיבות ושינויים **מגיע ממילון בקוד**. 2-3 דוגמאות שיחה בפרומפט. כל שינוי נבדק מול ההערכה (החלטה 24).

### החלטה 12: תלוש (תוספת)

```
העלאה (PDF/JPG/PNG ≤5MB, בדיקת סוג לפי תוכן) → Storage פרטי → extract_payslip
→ Gemini generateObject + zod → בדיקות → כרטיס אישור לעריכה → update_profile (מקור: תלוש, מאושר) → מחיקת הקובץ
```
- כל שדה: `{ value: number | null, label: string | null }`. **לא בטוח ← null.**
- אחוזי פנסיה/קה"ש **מחושבים בקוד** מהסכום ומהברוטו. מחוץ ל-0-10% ← לא ממולא.
- שווי שימוש מהתלוש **לבדיקה בלבד**; השתתפות מהתלוש ממלאת את השדה.
- מאחורי `DocumentExtractor`. בהדגמה רק תלושים פיקטיביים. כשל ← איסוף ידני.

---

## 6. שלב ד: גמישות

### החלטה 13: ממשקים ומתאמים

| ממשק (`server/ports`) | מתאם בהדגמה | בעתיד |
|---|---|---|
| מודל שפה (ממשק AI SDK עצמו, **ללא עטיפה**) | `@ai-sdk/google` | Claude, OpenAI, OpenRouter |
| `DocumentExtractor` | Gemini | OCR ייעודי |
| `UsageValueSource` | טבלה ב-Supabase | API רשות המסים |
| `ReferenceDataSource` | קבצי JSON | מערכת HR |
| `ConversationRepository` | Drizzle/Postgres | |
| `RepQuestionRepository` | Drizzle/Postgres | מערכת פניות |
| `IdentityProvider` | עוגיית הדגמה | Supabase Auth / SSO |
| `FileStorage` | Supabase Storage | S3, Azure Blob |
| `EventPublisher` | Supabase Realtime Broadcast | ללא פעמון (בדיקה תקופתית בלבד), Teams |

- **`server/container.ts` הוא המקום היחיד שבוחר מתאמים**, לפי משתני סביבה. `getChatModel()` שם, כולל שרשרת הגיבוי.
- **האקסל לא נקרא בזמן ריצה.** סקריפט ממיר ל-JSON.
- **לכל ממשק מתאם זיכרון** (`adapters/memory`) לבדיקות, ו-`MockLanguageModel` לסוכן.
- הליבה ללא ממשקים. אין ממשק לשירות בלי סיבה צפויה להחלפה.

---

## 7. שלב ה: נתונים

### החלטה 14: סכמת מסד הנתונים (Drizzle, `adapters/db/schema.ts`)

```
employees        id uuid PK · display_name · demo_key UNIQUE NULL · auth_user_id UNIQUE NULL · created_at
representatives  id uuid PK · email UNIQUE · name
conversations    id uuid PK · employee_id FK · status · rules_version · state jsonb
                 · version int · locked_until timestamptz NULL · realtime_channel text · created_at · updated_at
messages         id bigserial PK · conversation_id FK (cascade) · role · content jsonb · created_at
                 INDEX (conversation_id, id)
rep_questions    id uuid PK · conversation_id FK (cascade) · employee_id FK · topic · field · question
                 · context jsonb · status (open|answered|declined) · answer_value jsonb · answer_note
                 · answered_by · created_at · answered_at · processed_at
                 UNIQUE (conversation_id, field) WHERE status = 'open'
                 INDEX (status, created_at)
usage_values     PK (tax_year, registration_year, vehicle_type_code, manufacturer_code, model_code)
                 · manufacturer_name · commercial_name · model_description · propulsion smallint
                 · list_price · usage_value · effective_date
                 INDEX gin_trgm (commercial_name), (manufacturer_name)
data_imports     id · source_file · sha256 · rows · tax_year · imported_at
agent_logs       id · conversation_id FK (cascade) · turn_id · step · tool · input jsonb (מוסתר) · output jsonb
                 · provider · duration_ms · tokens_in · tokens_out · created_at
rate_limits      key · window_start · count  (PK key+window_start)
```

- מצב השיחה = `jsonb` (תמיד נקרא/נכתב שלם, נבדק ב-zod). מה שמחפשים לפיו = עמודות.
- **נעילת תור:** `UPDATE ... SET locked_until = now() + 30s WHERE id = $1 AND (locked_until IS NULL OR locked_until < now()) RETURNING`.
- **עדכון מצב:** מותנה ב-`version` (optimistic); התנגשות ← קריאה מחדש וניסיון חוזר.
- **תשובת נציג = ערך מובנה** לפי סכימת השדה, + הערה חופשית.
- **RLS מופעל על כל הטבלאות, ללא מדיניות** ← המפתח הציבורי לא קורא כלום. Bucket `payslips` פרטי.
- Migrations ב-`drizzle/`, נוצרים ב-Drizzle Kit. **רק מוסיפים** בשבוע ההגשה.

### החלטה 15: ייבוא

**מאגר רשות המסים** (`scripts/import-usage-values.ts`):
1. קידוד **windows-1255** (`iconv-lite`)
2. מיפוי עמודות **לפי שם כותרת** (סדר לא משנה; חסרה ← כשל)
3. `trim` לכל שדה · **קודים כמחרוזת** · מספרים מנוקים · `dd/mm/yyyy` ← ISO
4. הנעה לפי `rules.valueOfUse.driveField` (**לא לפי הכותרת המטעה**); ערך מחוץ ל-0-3 ← כשל
5. ייחודיות המפתח המלא (5 שדות) ← אחרת כשל
6. טעינה לטבלת ביניים והחלפה אטומית בטרנזקציה. ניתן להרצה חוזרת. רישום ב-`data_imports`.

**האקסל** (`scripts/import-excel.ts`, `exceljs`) ← `data/catalog.json`, `data/occupations.json`, `data/sample-employees.json` (**בלי ת"ז**), `data/reference-results.json` (לבדיקות). כל קובץ נבדק ב-zod.

**דוח התאמה קטלוג-מאגר:** לכל רכב: בדיוק שורה אחת לפי המפתח המלא (אחרת **שגיאה**) · הנעה תואמת (אחרת **שגיאה**) · שווי תואם (אחרת **אזהרה**, המאגר קובע) · שם תואם (**אזהרה**). השלמה: `taxYear` מהמאגר, `vehicleTypeCode = '1'` (או עמודה אם תתווסף).

> **מלכודת מאומתת:** בלי `vehicleTypeCode` המפתח אינו ייחודי (512 התנגשויות). ATTO 3 (01014/00003/2025) מחזיר גם BYD TANG (קוד סוג 2, שווי 6,950). **אסור לשלוף במפתח חלקי.**

**חיפוש רכב נוכחי:** trigram על שם מסחרי ויצרן + סינון שנת רישום, עד 10 תוצאות (שם, תאור דגם, שנה, שווי).

שורת מקור בממשק: "שווי שימוש: רשות המסים, שנת מס 2026, עודכן ב-..." מתוך `data_imports`.

### החלטה 16: פרטיות ושמירה

| נתון | שמירה |
|---|---|
| קובץ תלוש | נמחק מיד אחרי חילוץ; ניקוי יתומים > שעה |
| שיחה, הודעות, שאלות | עד 30 יום אחרי סגירה (cascade) |
| `agent_logs` | 14 יום |
| מאגר, נתוני ייחוס, `employees` | ללא הגבלה |

- **לא נשמרים:** ת"ז (מדלגים בייבוא) · תלוש גולמי · שדות שלא נחוצים לחישוב (לא בסכימת החילוץ) · שום דבר רגיש בדפדפן · מפתחות במסד.
- **צמצום:** הנציג רואה הקשר **בלי שכר** · המודל מקבל שכר **בלי שם** · יומנים מסתירים סכומים · ביומני Vercel אין שכר.
- `npm run demo:reset` · Cron יומי לניקוי (`/api/cron/cleanup`, מוגן `CRON_SECRET`).
- **לפיילוט:** תקופות שמירה מאושרות, מסלול בתשלום ללא אימון על הנתונים, בדיקת התאמה לחוק הגנת הפרטיות ולנהלי אבטחת מידע, אזור ענן מתאים.

---

## 8. שלב ו: נציג וזמן אמת

### החלטה 17

- **הדפדפן לא קורא טבלאות ישירות.** Supabase Realtime **Broadcast** משמש "פעמון" ללא נתונים (`{ type: 'updated' }`) בערוץ עם מזהה אקראי (`conversations.realtime_channel`). הדפדפן מושך מצב דרך ה-API.
- **גיבוי:** בדיקה כל 15 שניות כשיש שאלה פתוחה + בחזרה ללשונית. `GET ...?sinceVersion=n` ← `304` אם לא השתנה.

**מענה נציג:**
```
1. אימות: נציג, שאלה פתוחה, ערך תקין לסכימת השדה
2. טרנזקציה: answered + answer_value · הודעת מערכת להיסטוריה
3. תשובה מיידית לנציג
4. ברקע (after()):
   a. נעילת שיחה (תפוסה ← המתנה)
   b. **הקוד** מחיל את הערך במצב (מקור: נציג, מאושר)
   c. חישוב מחדש של החלופות שחיכו
   d. הסוכן מנסח הודעה (כשל ← הודעה מתבנית)
   e. processed_at · f. שחרור נעילה + פעמון
```
- **בכל טעינת שיחה:** שאלה שנענתה ולא טופלה ← מטופלת (אידמפוטנטי).
- נציג לא יכול לענות ← `decline` עם הערה; הבוט מסביר ומפנה למשאבי אנוש.
- מסך הנציג: ערוץ פעמון לנציגים + בדיקה כל 15 שניות.

---

## 9. שלב ז: אבטחה

### החלטה 18: תפקידים והרשאות (`server/security/authorize.ts`)

| פעולה | עובד | נציג | מערכת |
|---|---|---|---|
| פתיחת שיחה | ✓ לעצמו | ✗ | ✗ |
| צפייה/הודעות בשיחה | ✓ שלו בלבד | ✗ | ✓ |
| עדכון מצב | דרך הסוכן/פעולות ישירות, שלו | ✗ | ✓ |
| העלאת תלוש | ✓ שלו | ✗ | ✗ |
| פתיחת שאלה לנציג | דרך הסוכן | ✗ | ✗ |
| צפייה בשאלות / הקשר | ✗ | ✓ (הקשר בלי שכר) | ✓ |
| מענה / דחייה | ✗ | ✓ | ✗ |
| שיחה מלאה של עובד | ✗ | **✗** | ✓ |
| כללים / קטלוג / מאגר | ✗ | ✗ | ✗ (סקריפטים בלבד) |

- **ברירת מחדל: אסור.** בדיקת **בעלות על המשאב** מול העוגייה. "לא שלו" ← **404**.
- דפוס קבוע בכל נתיב: `requireUser()` ← טעינה ← `authorize()`.
- הכלים רצים בהרשאות המשתמש.
- עוגייה: עובד 24 שעות, נציג 8 שעות. קוד נציג: 5 ניסיונות לדקה.
- **כניסת הדגמה מאפשרת בכוונה לבחור עובד לדוגמה.** מתועד במגבלות; כבוי בפיילוט.

### החלטה 19: סודות וגישה למסד

| משתנה | איפה |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`, `SESSION_SECRET`, `REP_ACCESS_CODE`, `CRON_SECRET` | **שרת בלבד** |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | דפדפן (פעמון בלבד) |

- `NEXT_PUBLIC_` = קו אדום · `import 'server-only'` בכל קובץ שרת · **`server/security/env.ts` בודק ב-zod בעצלות (בשימוש הראשון), לא בזמן build** · `.env.example` בלבד ב-Git · מפתח Gemini מוגבל ל-API שלו · נוהל החלפה ב-README.
- **גישה למסד:** Drizzle + postgres.js דרך ה-pooler (6543, transaction mode, `prepare: false`) לשאילתות וטרנזקציות. `supabase-js` רק ל-Storage ול-Realtime. Migrations וייבוא דרך `DIRECT_DATABASE_URL` (5432).
- מפתח השירות עוקף RLS ⇒ **ההגנה האמיתית היא `authorize`**, ולכן בדיקותיו חשובות.

### החלטה 20: קלט, מודל, קצב

- **כניסה:** zod לכל נתיב · הודעה ≤ 2,000 תווים · גוף ≤ 100KB · UUID · קובץ ≤ 5MB, סוג לפי בתים ראשונים.
- **פרמטרי כלים:** סכימה (AI SDK) + בדיקה עניינית (קיום, שייכות לשיחה, רשימה מורשית, טווח).
- **יציאה:** Markdown **ללא HTML וללא קישורים פעילים**, ללא `dangerouslySetInnerHTML`.
- **הזרקת הוראות:** ההגנה ארכיטקטונית (כלים לא יכולים לחרוג); תלוש עובר רק כמספרים; הערת נציג בתוחמים.

| מגבלת קצב | ערך | לפי |
|---|---|---|
| הודעות צ'אט | 10/דקה, 200/יום | עובד |
| שיחה/עובד חדש | 20/שעה | IP |
| תלוש | 5/שעה | עובד |
| קוד נציג | 5/דקה | IP |
| טוקנים | `DAILY_TOKEN_BUDGET` | גלובלי; חריגה ← הודעה, הטבלה ממשיכה |

- CSRF: `sameSite=lax` + בדיקת `Origin` בכל שינוי · כותרות: CSP בסיסי, `X-Frame-Options: DENY`, `Referrer-Policy`.
- שגיאות: `{ "error": { "code", "message" } }`, עברית, ללא פרטים פנימיים, עם מזהה בקשה.

---

## 10. שלב ח: חוזים ומבנה

### החלטה 21: API (Route Handlers בלבד)

- **הדפדפן שולח בצ'אט רק את ההודעה החדשה**; השרת טוען היסטוריה ומצב.
- **אין חישוב עסקי בדפדפן**; השרת שולח ערכים מוכנים (מעוגלים, הפרש לפני עיגול).

| נקודה | |
|---|---|
| `POST /api/auth/demo` · `POST /api/auth/logout` · `GET /api/me` | כניסה |
| `POST /api/conversations` · `GET /api/conversations` | שיחות |
| `GET /api/conversations/:id[?sinceVersion=n]` | תמונת מצב (304 אם לא השתנה) |
| `POST /api/conversations/:id/chat` | תור, streaming |
| `POST /api/conversations/:id/alternatives` | הוספה ישירה מהטבלה (ללא מודל) |
| `PATCH /api/conversations/:id/alternatives/:altId` | הסתרה |
| `POST /api/conversations/:id/payslip` · `.../profile/confirm` | תלוש (תוספת), גם טופס מילוי ידני |
| `POST /api/conversations/:id/quick-fill` | רק בהדגמה |
| `GET /api/rep/questions?status=open` · `GET /api/rep/questions/:id` | נציג |
| `POST /api/rep/questions/:id/answer` · `.../decline` | נציג |
| `GET /api/health` · `GET /api/cron/cleanup` | מערכת |

פעולה ישירה ללא מודל ← **הודעת מערכת** להיסטוריה כדי שהסוכן ידע.
חוזים: `src/contracts` (zod משותף, `z.infer`), **מצומצמים בכוונה** (הקשר נציג ללא שדות שכר ברמת הטיפוס).

```ts
ComparisonRowDTO = { alternativeId, label, status: 'current'|'ready'|'pending_representative'|'ineligible',
  hidden, reasons: {code,text}[], usageValue, participation, electricBonusNet, maintenance,
  familyGapShare, net, deltaFromCurrent, conclusion }   // מספרים שלמים או null
```

### החלטה 22: מבנה תיקיות

```
src/app              עמודים + api
src/components       chat/ comparison/ rep/ ui/
src/contracts        חוזים משותפים
src/lib              עזרים בטוחים לדפדפן
src/server/domain        model/ net/ eligibility/ comparison/
src/server/application   conversation/ agent/ comparison/ rep/
src/server/ports · adapters/{db,supabase,gemini,files,identity,memory} · security · i18n/he.ts · container.ts
data/                strauss-rules.json (מקורי) + JSON שנוצרו · source/ (xlsx; csv מחוץ ל-Git)
prompts/ scripts/ drizzle/ evals/
tests/               domain/ import/ application/ security/ agent/ e2e/
docs/
```
קובץ לכל פונקציה ראשית. ייבוא אסור = שגיאת lint.

### החלטה 23: תצוגת ההשוואה

- **שורה לכל חלופה**, היום בראש · מיון לפי הפרש · ממתינות ולא זכאיות בסוף · מוסתרות מקופלות.
- **עמודות:** חלופה+סיבה · שווי שימוש · השתתפות · חשמל/אחזקה · נטו · הפרש (סימן + חץ + צבע) · מסקנה · פעולות.
- **שורת סיכום עובדתית** ("הנטו הגבוה ביותר: ..." / "אף חלופה לא מגדילה את הנטו").
- **"איך חושב"**: פירוט מלא היום מול החלופה, + עלות מול תקציב.
- **הוספת חלופה מהטבלה**, ישירות.
- **טלפון:** לשוניות שיחה/השוואה, כרטיסים. **עדכון חי** מודגש + `aria-live`. מספרים ב-`dir="ltr"`.
- **שורת מקור:** "שווי שימוש: רשות המסים, 2026 · כללים: ... · השוואה להמחשה, לא המלצה".

**תבניות מסקנה (בפורמט עמודת "למה" בגיליון):**

| שינוי | תבנית |
|---|---|
| שווי שימוש | `שווי שימוש {מ} → {ל} ₪` |
| נוסף / בוטל | `נוסף שווי שימוש {x} ₪` / `בוטל שווי שימוש {x} ₪` |
| אחזקה | `נוספה אחזקה {x} ₪ (חייבת במס)` / `בוטלה אחזקה {x} ₪` |
| חשמל | `+250 ₪ נטו החזר חשמל (מגולם)` |
| השתתפות | `השתתפות {מ} → {ל} ₪` |
| משפחתי | `חלק העובד בפער המסלול המשפחתי {x} ₪` |

צירופים כמו בגיליון: "נוסף שווי שימוש 2,430 ₪ ובוטלה אחזקה 1,500 ₪", "בוטל שווי שימוש 4,570 ₪, נוספה אחזקה 2,000 ₪ (חייבת במס)". מפריד בין פריטים: ` · `. **נבדק מילה במילה מול הגיליון.**

---

## 11. שלב ט: איכות והגשה

### החלטה 24: בדיקות

| רמה | תיקייה | מה |
|---|---|---|
| 1 ליבה | `tests/domain` | 12 ערכי ייחוס (נטו, מס, בל"ל+בריאות, ±0.5) · גילום = 250 ±0.01 · מקרי קצה · זכאות · **מסקנות וסיבות מילה במילה** · כיסוי מלא |
| 2 ייבוא | `tests/import` | CSV קטן ב-windows-1255 · כפילות ← כשל · **ATTO 3 במפתח מלא = 1, חלקי = 2** · דוח התאמה 20/20 |
| 3 תרחישים | `tests/application` | הוספה (3 מצבים) · תיקון ← חישוב מחדש · תשובת נציג · אידמפוטנטיות · נעילה · חסרים לכל תרחיש |
| 4 אבטחה | `tests/security` | כל תא בטבלת ההרשאות · 404 לשיחה זרה · הקשר נציג בלי שכר · 401 · קצב |
| 5 סוכן | `tests/agent` | MockLanguageModel: פרמטר שגוי, קריאה כפולה, מגבלת צעדים, נושא לא מורשה, רכב לא קיים |
| 6 הערכה | `evals/` | 10 תרחישים מול Gemini: שאל רק חסר, הפעיל כלי לפני מספר, אין מספר שלא מכלי, הסביר סיבה, עברית ← דוח ציונים (ידני) |
| 7 E2E | `tests/e2e` | Playwright + `AI_PROVIDER=mock`: השוואה · נציג בחלון שני · רענון |

CI (GitHub Actions): lint, typecheck, רמות 1-5, build. הליבה בגישת בדיקות-תחילה.

### החלטה 25: שגיאות וגיבוי

- **ההשוואה לא תלויה במודל.**
- שרשרת: Gemini 2.5 Flash ← Gemini 2.5 Flash-Lite (מכסה נפרדת) ← מודל דרך OpenRouter **שעבר את ההערכה** ← **מצב ללא בוט** (טבלה, הוספה מהטבלה, טופס מילוי ידני).
- שגיאה זמנית ← ניסיון חוזר אחד · 429 ← מעבר מיידי + השבתת ספק 60 שניות · תור שנקטע ← מחיקת חלקי, הרצה מחדש (כלים אידמפוטנטיים).
- תלוש ← ידני · מסד ← ניסיון אחד, אחרת 503 · פעמון ← בדיקה תקופתית · כללים לא תקינים ← השרת לא עולה · שווי לא נמצא ← שורה "שגיאת נתונים" + התראה.
- דפדפן: ההודעה נשמרת בכשל + "שליחה מחדש" · Error Boundary נפרד לצ'אט ולטבלה.
- מזהה בקשה ביומן ובהודעה · יומנים מובנים ללא שכר · `/api/health`.

### החלטה 26: סביבות

| סביבה | איפה | Supabase |
|---|---|---|
| פיתוח | מקומי | `dev` |
| Preview | Vercel, לכל ענף | `dev` |
| Production | Vercel, `main` | `prod` |

- אזורים: Supabase `eu-central-1`, Vercel `fra1` (`vercel.json`).
- `DATABASE_URL` (6543, ריצה) · `DIRECT_DATABASE_URL` (5432, migrations וייבוא).
- Vercel: env לפי סביבה · `maxDuration` לצ'אט · Cron יומי (שומר גם את Supabase ער).
- שחרור: ענף ← CI ← Preview ← מיזוג ← Production ← `/api/health`. חזרה לאחור ב-Vercel. **הקפאה יום לפני הגמר.** Node 22 מקובע.

### החלטה 27: הגשה

- כתובת חיה + הוראות כניסה + **קוד נציג בטקסט ההגשה** (לא במאגר) + טיפ לשני חלונות.
- מאגר: `README.md`, `docs/ARCHITECTURE.md`, `SUMMARY.md`, `.env.example`, `data/strauss-rules.json`, `LICENSE` (לוודא דרישה בתקנון).
- `SUMMARY.md`: מה עובד (לפי 10 התרחישים) · הנחות עם נימוק · מגבלות · דרישות פיילוט.
- הוכחות: 12/12 + מסקנות, דוח הערכה, צילומי מסך/GIF.
- **שלושה מסרים:** כל מספר מקוד מאומת · המערכת לא מנחשת · מוכנה לפיילוט (מחליפים קבצים ומתאמים).

---

## 12. נתוני ייחוס מאומתים

אב-טיפוס של שיטת החישוב (החלטה 6) שוחזר מול גיליון "חישובים" והגיע **לכל הערכים**:

| עובד | היום: נטו / מס / בל"ל+בריאות | חלופה: נטו / מס / בל"ל+בריאות | הפרש | גילום ברוטו | פער משפחתי |
|---|---|---|---|---|---|
| נועה לוי | 11,032 / 3,443 / 2,153 | ATTO 3: 11,693 / 3,283 / 2,092 | +661 | 440 | 0 |
| דוד כהן | 8,600 / 1,369 / 1,250 | CARNIVAL: 5,078 / 2,861 / 1,879 | −3,522 | 0 | 1,150 |
| רחל פרידמן | 15,047 / 3,419 / 2,144 | MG4: 13,109 / 3,910 / 2,315 | −1,938 | 473 | 0 |
| יוסי מזרחי | 10,693 / 3,991 / 2,301 | EV3: 11,900 / 3,497 / 2,128 | +1,207 | 440 | 0 |
| מיכל אברהם | 14,244 / 6,593 / 3,248 | ויתור 2,000: 17,806 / 5,694 / 2,935 | +3,562 | 0 | 0 |
| אלי שמעון | 17,073 / 9,367 / 4,170 | MODEL 3: 17,794 / 9,183 / 4,106 | +721 | 473 | 0 |

**מה ההרצה הכריעה:** החזר חשמל מגולם **אינו פנסיוני** · הפער המשפחתי מול **תקציב קבוצת העובד** (דוד: (6,000 − 3,700) / 2 = 1,150) · זיכוי פנסיה 232.75 אצל כולם · "רכב חובה" לא חוסם מסלול משפחתי.

**ערכים נוספים לבדיקה (מחושבים באותה שיטה, לא מהגיליון):** נועה ← EV3: 11,779 (+747) · ויתור 2,000: 14,231 (+3,199) · MAZDA 3: 10,746 (−286).

**המאגר:** 77,988 שורות, שנת מס יחידה 2026 · כל 20 רכבי הקטלוג נמצאו, שווי תואם · הנעה: 0 בנזין, 1 היברידי, 2 פלאג-אין, 3 חשמלי · המפתח המלא ייחודי.

---

## 13. הנחות ושאלות פתוחות

| # | הנחה | בסיס | סטטוס |
|---|---|---|---|
| 1 | החזר חשמל מגולם לא פנסיוני | שחזור נטו הייחוס | **אומת** |
| 2 | פער משפחתי מול תקציב קבוצת העובד | דוד | **אומת** |
| 3 | "רכב חובה" לא חוסם מסלול משפחתי | דוד | **אומת** |
| 4 | גיל 23 כלול | `childMaxAge: 23` | הנחה, תתועד |
| 5 | פלאג-אין לא זכאי להחזר חשמל | ניסוח הכלל | הנחה, תתועד |
| 6 | `vehicleTypeCode = 1` ושנת מס מהמאגר לרכבי הקטלוג | 20/20 בדוח ההתאמה | **אומת לקטלוג הנוכחי** |
| 7 | השתתפות מהקטלוג = מקור אמת | נתון רשמי של החברה | החלטה |
| 8 | מס לא שלילי (max 0) | היגיון מס | הנחה |
| 9 | עלות הרכב נבדקת מול תקציב קבוצת העובד (`COST_EXCEEDS_BUDGET`) | כמו חישוב הפער המשפחתי | הנחה, תתועד |
| 10 | הכלל "החזר חשמל רק ל-`electric`" חל גם על רכב משפחתי חשמלי | אין כזה בקטלוג הנוכחי | הנחה, תתועד |

**שינויים במסמך:** כל סטייה מהמסמך נרשמת כאן עם תאריך ונימוק, לפני שינוי הקוד.

| תאריך | החלטה | שינוי | נימוק |
|---|---|---|---|
| 21.10.2026 | 6 | חתימת `calculateNet` ללא פרמטר `entitlements`: `calculateNet(profile, inputs, netMethod)` | שלב 2 באותה החלטה קבע שרכיבי ההסדר מוזנים מבחוץ, והפרמטר הכפיל את הפער המשפחתי והאחזקה. ההפרדה (בודק זכאות מחליט אם, מנוע מחשב כמה) נשמרת, והבדיקות נכתבות מול מספרים מהגיליון |
| 21.10.2026 | 4 | `Vehicle.key` הוא `CatalogRegistryKey` (שנת רישום, קוד תוצר, קוד דגם); `RegistryKey` המלא (עם `taxYear` ו-`vehicleTypeCode`) מורכב בשכבת היישום בשליפה מהמאגר | הקטלוג באקסל לא כולל שנת מס וקוד סוג רכב, והם משלימים מהמאגר (החלטה 15). מילוי שלהם בטוען היה ניחוש |
| 21.10.2026 | 7 | `EligibilityResult` הוא איחוד (`entitlements` רק ב-`eligible`, `missingFields` רק ב-`needs_data`); חתימות `checkEligibility(profile, arrangement, data, current?)` ו-`listEligibleOptions(profile, data)` כש-`data = { catalog, occupations, rules }`; `SAME_AS_CURRENT` הוא הערה בלבד | זכאויות באפס היו מספר מומצא ל"בלי מספר"; הבודק צריך את רשימת העיסוקים כדי לגזור קבוצה, ולכן החתימה המקורית (בלי עיסוקים) לא הספיקה |
| | | | |
