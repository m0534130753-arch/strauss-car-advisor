# יועץ הרכב של שטראוס

עובד שואל "מה יקרה לנטו שלי אם אעבור לרכב חשמלי?", והבוט עונה בדקה, עם השוואה ברורה, מוסברת ונכונה.

- בוט בעברית שאוסף רק את מה שחסר, ופונה לנציג כשצריך
- מנוע חישוב בקוד שאומת מול 12 ערכי הייחוס של שטראוס
- שווי שימוש ממאגר רשות המסים, לא ניחוש
- טבלת השוואה: מה השתנה, למה, וכמה זה שווה בנטו
- מסך נציג: שאלות פתוחות, תשובה, והשיחה ממשיכה מאותה נקודה

> **סטטוס:** בפיתוח. ראו [docs/ROADMAP.md](docs/ROADMAP.md).

## מסמכים

| מסמך | תוכן |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | האפיון המלא: 27 החלטות, נתוני ייחוס מאומתים, הנחות |
| [docs/ROADMAP.md](docs/ROADMAP.md) | תוכנית בשלבים עם שערי בדיקה, ויומן התקדמות |
| [docs/SETUP.md](docs/SETUP.md) | הקמת הסביבה צעד אחר צעד |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Git, ענפים, ועבודה עם Claude Code |
| [docs/TOOLS.md](docs/TOOLS.md) | MCP, skills, והגנה על סודות |
| [CLAUDE.md](CLAUDE.md) | הוראות העבודה ל-Claude Code |

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # למלא לפי docs/SETUP.md
npm run check                # lint + typecheck + tests
npm run dev                  # http://localhost:3000
```

## טכנולוגיות

TypeScript · Next.js 16 · Vercel AI SDK · Gemini · Supabase (Postgres) · Drizzle · zod · Tailwind · Vitest

## נתונים

- `data/strauss-rules.json`: קובץ הכללים של האתגר, ללא שינוי (בפיילוט מחליפים את הקובץ, לא את הקוד)
- `data/source/strauss-challenge-data.xlsx`: קטלוג, עיסוקים, עובדים לדוגמה וחישובי ייחוס
- `data/source/*.csv`: מאגר שווי השימוש של רשות המסים 2026 (19MB, מחוץ ל-Git; ראו SETUP)

כל הנתונים פיקטיביים, חוץ מקודי התוצר/הדגם ושווי השימוש שנלקחו ממאגר רשות המסים.
