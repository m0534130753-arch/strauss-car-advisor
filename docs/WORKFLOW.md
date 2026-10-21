# ניהול העבודה: Git, ענפים, ועבודה עם Claude Code

המטרה: אף שורת קוד לא הולכת לאיבוד, שום דבר לא נדרס, ותמיד אפשר לחזור אחורה.

## 1. מודל הענפים

```
main  ←── מוגן. רק PR עם CI ירוק. תמיד במצב שעובד.
 ├── s1/t1-import-excel     ←── ענף לכל משימה
 ├── s1/t5-net-engine
 └── s2/t4-usage-import
```

- **אף פעם לא עובדים על `main`.** כל משימה מתחילה ב:
  ```bash
  git switch main && git pull
  git switch -c s1/t5-net-engine
  ```
- **ענף אחד = משימה אחת = PR אחד.** PR קטן קל לבדוק ולהחזיר.
- בסוף משימה: `git push -u origin <branch>` ← PR ב-GitHub ← CI ירוק ← **Squash and merge** ← מחיקת הענף ← `git switch main && git pull`.

## 2. Commits

פורמט Conventional Commits, באנגלית:

```
feat(domain): add income tax brackets calculation
test(domain): add reference tests for six sample employees
fix(eligibility): plug-in hybrids are not entitled to electric bonus
refactor(application): extract missingFields
docs(architecture): record decision change for rep answers
chore(roadmap): close stage 1
```

- **commit אחרי כל צעד שעובר בדיקות**, לא פעם ביום. commits קטנים = נקודות חזרה.
- לפני `git add`: תמיד `git status` ולבדוק שאין קבצים לא צפויים (`.env`, קבצי CSV גדולים, `coverage/`).
- **`npm run check` לפני כל commit.**

## 3. מה אסור (ונחסם גם ב-`.claude/settings.json`)

| פעולה | למה |
|---|---|
| `git push --force` / `-f` | דורס היסטוריה ב-GitHub |
| `git reset --hard` | מוחק שינויים שלא נשמרו, בלי דרך חזרה |
| `git clean` | מוחק קבצים שלא במעקב |
| commit ישירות ל-`main` | עוקף את ה-CI |
| `rm -rf` | |
| קריאה או עריכה של `.env*` | סודות |

**דחיפה, מיזוג, rebase, התקנת חבילות, migrate וייבוא** דורשים אישור שלך בכל פעם.

## 4. איך חוזרים אחורה (מהקל לכבד)

| מצב | פתרון |
|---|---|
| Claude ערך קבצים ואת רוצה לבטל את העריכה האחרונה | ב-Claude Code: `Esc` פעמיים או `/rewind`, ובחירת נקודה |
| קובץ אחד השתבש, לא עשית commit | `git restore <file>` |
| ה-commit האחרון בענף לא טוב | `git revert HEAD` (יוצר commit מבטל, בטוח) |
| מיזוג ל-`main` שבר משהו | `git revert <merge-commit>` ב-PR חדש; ב-Vercel: Instant Rollback לגרסה הקודמת |
| הכל השתבש בענף | `git switch main` ומתחילים ענף חדש; הענף הישן נשאר לעיון |

## 5. עבודה עם Claude Code

### בתחילת יום
```
/status
```

### לכל משימה
```
/next-task          ← Claude מציג תוכנית; את מאשרת או מתקנת
(מימוש)
/verify             ← בדיקה עצמית מלאה מול Definition of Done
```
ואז דחיפה ו-PR (ידנית או לבקש מ-Claude, באישור).

### בסוף שלב
```
/close-stage        ← שער השלב; לא עוברים הלאה בלי ✅ בכל פריט
```

### היגיינת שיחה
- **`/clear` בין משימות.** שיחה ארוכה = יותר טעויות. כל ההקשר שצריך נמצא ב-CLAUDE.md וב-docs.
- `/compact` אם משימה אחת מתארכת.
- **Plan Mode** (`Shift+Tab` עד "plan") למשימות שנוגעות ב-3+ קבצים: Claude מתכנן בלי לגעת בקבצים.
- **לא מריצים שתי שיחות Claude על אותה תיקייה במקביל.** אם צריך עבודה מקבילה (למשל ממשק בזמן שהסוכן נבדק): `git worktree add ../strauss-s6 s6/t2-login` ופותחים את התיקייה השנייה בחלון נפרד.

### בדיקת עבודה של Claude
- לפני אישור, פתחי את Source Control ב-VS Code וקראי את ה-diff. משהו לא ברור? "תסביר את השינוי בשורה X".
- אם Claude משנה בדיקה כדי שתעבור, או מוסיף `eslint-disable`: זה סימן לעצור ולשאול למה.
- אם Claude "מכייל" קבוע כדי להגיע לערך ייחוס: עצרי. השיטה מאומתת (ARCHITECTURE §12), כך שזה באג אחר.

## 6. שינוי החלטה בארכיטקטורה

1. עוצרים את המשימה.
2. מעדכנים את ההחלטה ב-`docs/ARCHITECTURE.md` ומוסיפים שורה לטבלת "שינויים במסמך" (§13): תאריך, החלטה, שינוי, נימוק.
3. אם השינוי משפיע על משימות ב-ROADMAP, מעדכנים גם אותן.
4. commit נפרד: `docs(architecture): ...`, ורק אז ממשיכים בקוד.

## 7. קונפליקטים

- מבקשים מ-Claude: "יש קונפליקט ב-X, הצג את שני הצדדים ותציע איחוד". לא מקבלים "ours/theirs" בעיוורון.
- בקבצי `data/*.json` שנוצרים מסקריפט: לא פותרים ידנית, מריצים שוב את הסקריפט.
- `package-lock.json`: לוקחים את הגרסה מ-`main` ומריצים `npm install`.

## 8. גיבוי

- **`git push` בסוף כל משימה**, גם אם ה-PR עוד לא מוכן. GitHub הוא הגיבוי.
- ה-CSV (19MB) לא ב-Git. שמרי עותק מחוץ לתיקיית הפרויקט.
