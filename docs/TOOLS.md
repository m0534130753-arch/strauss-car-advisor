# כלים ל-Claude Code: MCP, Skills, והגנה על סודות

## העיקרון: מעט כלים, כל אחד עם סיבה

כל שרת MCP מוסיף תיאורי כלים להקשר של Claude בכל שיחה. יותר כלים = יותר הקשר מבוזבז ויותר בחירות שגויות. ההמלצה: **3-4 כלים**, ולכבות ב-`/mcp` את מה שלא רלוונטי לשלב הנוכחי.

## סיכום

| כלי | סוג | המלצה | מתי |
|---|---|---|---|
| **Context7** | MCP | **חובה** | מהיום הראשון |
| **Supabase MCP** (dev, קריאה בלבד) | MCP | מומלץ | משלב 2 |
| **Playwright MCP** | MCP | מומלץ | שלב 6 |
| **frontend-design** | Skill (Anthropic) | מומלץ | שלב 6 |
| shadcn/ui | CLI | בשימוש | שלב 6 (`npx shadcn@latest`) |
| GitHub CLI (`gh`) | CLI | מומלץ, במקום GitHub MCP | תמיד |
| Vercel MCP | MCP | רשות | שלב 7, לקריאת לוגים |
| UI UX Pro Max | Skill | לא נדרש | ראו למטה |
| 21st.dev Magic | MCP | לא נדרש | ראו למטה |

---

## Context7: חובה

**למה:** הפרויקט משתמש בגרסאות חדשות מאוד: Next.js 16.4, AI SDK 7, zod 4. הידע של המודל עליהן חלקי, והפרש של גרסה ראשית ב-AI SDK משנה שמות של פונקציות. Context7 מביא תיעוד עדכני לפי גרסה בזמן אמת. כבר כתוב ב-`CLAUDE.md` שיש להשתמש בו.

**התקנה** (בטרמינל):
```bash
npx ctx7 setup --claude
```
ההתקנה מזדהה דרך הדפדפן, יוצרת מפתח חינמי, ומחברת ל-Claude Code. בבחירה בין מצבים, בחרי **MCP**.

**שימוש:** בסוף בקשה, `use context7`. למשל: "איך מגדירים tools עם inputSchema ב-AI SDK 7? use context7".

> ל-Next.js יש גם תיעוד מקומי ב-`node_modules/next/dist/docs/`, שתואם בדיוק לגרסה המותקנת. `AGENTS.md` מפנה אליו.

## Supabase MCP: מומלץ, רק dev ורק קריאה

**למה:** Claude יכול לבדוק בעצמו את מצב הטבלאות, ה-migrations, ה-RLS, ולהריץ את **Security Advisor** של Supabase (שמזהה, למשל, טבלה בלי RLS). זה בדיוק "בודק את עצמו" בשלב 2.

**התקנה** (בטרמינל, מתיקיית הפרויקט; `<DEV_REF>` הוא מזהה הפרויקט מה-URL של dev):
```bash
claude mcp add --scope local --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<DEV_REF>&read_only=true&features=database,docs,debugging"
```
ואז אימות (בטרמינל רגיל, לא בתוך VS Code):
```bash
claude /mcp
```
← supabase ← Authenticate ← כניסה בדפדפן.

**כללים:**
- `project_ref` של **dev בלבד**. לעולם לא prod.
- `read_only=true`: כל השאילתות רצות כמשתמש קריאה בלבד. שינויים במסד עוברים רק דרך migrations בקוד.
- `--scope local`: ההגדרה נשמרת אצלך ולא נכנסת ל-Git.

## Playwright MCP: מומלץ לשלב 6

**למה:** Claude פותח את האפליקציה בדפדפן, לוחץ, מקליד ומצלם מסך. כך הוא בודק בעצמו שהטבלה נראית נכון, שה-RTL תקין ושהמסך עובד ברוחב טלפון, לפני שהוא אומר "גמרתי".

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```
שימוש: "פתח את localhost:3000, היכנס כנועה, הוסף ATTO 3, וצלם את הטבלה ברוחב 390px".

## frontend-design: מומלץ לשלב 6

Skill רשמי של Anthropic עם הנחיות עיצוב (היררכיה, טיפוגרפיה, ריווח, הימנעות מעיצוב "גנרי"). מתאים למסכי אפליקציה: טבלה, צ'אט, טפסים.

ב-Claude Code:
```
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@claude-code-plugins
```
(אם השם השתנה: `/plugin`, ואז חיפוש "frontend-design".)

בתחילת שלב 6: "השתמש ב-frontend-design כדי להגדיר כיוון עיצובי למערכת: RTL, עברית, טבלת השוואה כמרכז המסך".

## Vercel MCP: רשות

לקריאת לוגים של פריסות ושגיאות ב-Production, בשלב 7:
```bash
claude mcp add --transport http vercel https://mcp.vercel.com
```

## GitHub: `gh` במקום MCP

Claude Code משתמש ב-`gh` מהטרמינל (פתיחת PR, צפייה ב-CI). זה מספיק, ולא צריך שרת MCP נוסף. דחיפות ומיזוגים דורשים את אישורך (ב-`.claude/settings.json`).

---

## על ההמלצה מהמדריך של eilon.co

המדריך ממליץ על שני דברים לבניית אתרים עם Claude Code:

**UI UX Pro Max (Skill):** אוסף הנחיות עיצוב. הוא לא מזיק, אבל **חופף ל-frontend-design**, ושני ספרי חוקים לעיצוב באותו פרויקט עלולים לתת הוראות סותרות. אם כבר יש לך ניסיון טוב איתו, אפשר להשתמש בו **במקום** frontend-design, לא בנוסף.

**21st.dev Magic (MCP):** מביא רכיבים מוכנים מקטלוג חיצוני. הוא בנוי בעיקר ל**דפי נחיתה ואתרי שיווק**, דורש חשבון ומפתח API, והרכיבים מגיעים עם סגנון משלהם, שלא תמיד מתאים ל-shadcn/ui ול-RTL. האפליקציה שלך היא כלי עבודה (צ'אט, טבלה, טופס נציג), לא דף נחיתה.

**המסקנה:** לא נדרשים. frontend-design + shadcn/ui + Playwright לבדיקה ויזואלית מכסים את מה שצריך. אם בכל זאת תרצי לנסות את Magic, רק למסך הכניסה בשלב 6, ולבדוק כל רכיב שהוא מביא מבחינת RTL ונגישות.

---

## הגנה על `.env`

**מה כבר מוגדר** ב-`.claude/settings.json` (נכנס ל-Git, חל על כל מי שעובד בפרויקט):

```json
"deny": [
  "Read(./.env)", "Read(./.env.*)", "Read(!./.env.example)",
  "Edit(./.env)", "Edit(./.env.*)",
  "Bash(printenv*)", "Bash(env)", ...
]
```

**מה זה חוסם:** את כלי הקריאה והעריכה של Claude, חיפוש (Grep/Glob), אזכור עם `@`, ופקודות קבצים מוכרות בטרמינל כמו `cat`, `head`, `tail`, `sed`.

**מה זה לא חוסם:** סקריפט (Node/Python) שפותח קבצים בעצמו. למשל, `npm run db:migrate` קורא את `.env.local`, וזה בסדר: הסקריפט משתמש בערכים ולא מדפיס אותם. בגלל זה גם `CLAUDE.md` אוסר להדפיס ערכי env, ו-`db:migrate` / `import:usage` דורשים אישור.

**שכבה נוספת (רשות):** ה-sandbox של Claude Code חוסם גישה ברמת מערכת ההפעלה. אפשר להפעיל עם `/sandbox`. לפרויקט הזה ההגדרות הקיימות מספיקות.

**ומה שהכי חשוב:** לא להדביק מפתחות בצ'אט. אם בטעות הדבקת, החליפי את המפתח אצל הספק (Supabase / Google) ועדכני את `.env.local` ואת Vercel.

## בדיקה

ב-Claude Code:
```
/mcp       ← context7 (ובהמשך supabase, playwright) מחוברים
/status    ← Setting sources כולל "Shared project settings"
```
