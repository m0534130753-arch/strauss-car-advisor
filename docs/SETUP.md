# הקמת סביבת העבודה, צעד אחר צעד

זמן משוער: כשעה וחצי. בסוף: הפרויקט רץ אצלך, ב-GitHub עם CI ירוק, וב-Vercel עם כתובת חיה.

> **כלל ברזל:** מפתחות וסיסמאות נכנסים **רק** לקובץ `.env.local` ולמסך משתני הסביבה של Vercel. אף פעם לא לצ'אט עם Claude, לא לקוד, ולא לקובץ אחר.

רשימת מה שתאספי בדרך (שמרי בצד, למשל במנהל סיסמאות):

| פריט | מאיפה |
|---|---|
| Supabase dev: URL, anon/publishable key, service_role/secret key, DB password, 2 connection strings | שלב 4 |
| Supabase prod: אותו דבר | שלב 4 |
| Gemini API key | שלב 5 |
| OpenRouter API key | שלב 6 |
| SESSION_SECRET, CRON_SECRET, REP_ACCESS_CODE | שלב 7 |

---

## 1. כלים במחשב

1. **Node.js 22 LTS**: מ-[nodejs.org](https://nodejs.org) (גרסת 22). בדיקה בטרמינל: `node -v` ← `v22.x`.
   - אם יש כבר גרסה אחרת: nvm (Mac/Linux) או nvm-windows, ואז `nvm install 22 && nvm use 22`.
2. **Git**: מ-[git-scm.com](https://git-scm.com). בדיקה: `git --version`. הגדרה חד-פעמית:
   ```bash
   git config --global user.name "השם שלך"
   git config --global user.email "המייל שלך ב-GitHub"
   ```
3. **VS Code**, ובו התוספים: **Claude Code** (של Anthropic), **ESLint**, **Tailwind CSS IntelliSense**, **Vitest**.
4. **Claude Code CLI** (לטרמינל, נדרש גם לחיבור MCP): לפי ההוראות העדכניות ב-[code.claude.com/docs](https://code.claude.com/docs). בדיקה: `claude --version`.
5. **GitHub CLI** (מומלץ): מ-[cli.github.com](https://cli.github.com), ואז `gh auth login`.

## 2. הפרויקט במחשב

1. חלצי את קובץ ה-zip לתיקייה קבועה, למשל `Documents/projects/strauss-car-advisor`.
2. פתחי טרמינל בתיקייה:
   ```bash
   npm install
   npm run check
   ```
   אמור להסתיים בלי שגיאות, עם `1 passed`.
3. ה-CSV של רשות המסים כבר נמצא ב-`data/source/` (הוא מחוץ ל-Git בכוונה, 19MB). שמרי עותק נוסף מחוץ לתיקייה.

## 3. GitHub

1. ב-[github.com/new](https://github.com/new): שם `strauss-car-advisor`, **בלי** README, `.gitignore` או רישיון (כבר יש). ציבורי או פרטי: לפי דרישות ההאקתון (בהגשה כנראה צריך גישה לקוד).
2. בטרמינל בתיקיית הפרויקט:
   ```bash
   git status                      # לוודא שאין .env או CSV ברשימה
   git remote add origin https://github.com/<user>/strauss-car-advisor.git
   git push -u origin main
   ```
3. ב-GitHub ← Actions: ה-CI רץ ואמור להיות ירוק ✓.
4. **הגנה על `main`**: Settings ← Rules ← Rulesets ← New branch ruleset:
   - Target: `main`
   - ✓ Restrict deletions · ✓ Block force pushes
   - ✓ Require a pull request before merging
   - ✓ Require status checks to pass ← הוסיפי `check`
   - Bypass list: ריק (גם את עוברת דרך PR)

## 4. Supabase (שני פרויקטים)

1. הרשמה ב-[supabase.com](https://supabase.com) (אפשר עם GitHub).
2. **New project** פעמיים:
   - `strauss-car-advisor-dev` ו-`strauss-car-advisor-prod`
   - **Region: Central EU (Frankfurt)**, חשוב: אותו אזור כמו Vercel
   - Database password: חזקה, **לשמור** (תצטרכי אותה למחרוזות החיבור)
3. בכל פרויקט, אספי:
   - **Project Settings ← API Keys**: ה-URL, המפתח הציבורי (`anon` / `publishable`), והמפתח הסודי (`service_role` / `secret`)
   - **כפתור Connect** (למעלה):
     - **Transaction pooler** (פורט **6543**) ← `DATABASE_URL`
     - **Direct connection** (פורט **5432**) ← `DIRECT_DATABASE_URL`. אם הרשת שלך לא תומכת ב-IPv6 והחיבור הישיר נכשל, השתמשי ב-**Session pooler** (גם פורט 5432)
   - להחליף את `[YOUR-PASSWORD]` בסיסמה
4. **אל תיצרי טבלאות ידנית.** הכל נוצר מ-migrations בשלב 2.

> תזכורת: פרויקט חינמי נרדם אחרי שבוע בלי פעילות. ה-Cron היומי (שלב 7) שומר אותו ער. עד אז, היכנסי ללוח של prod פעם בכמה ימים.

## 5. Gemini

1. [aistudio.google.com](https://aistudio.google.com) ← **Get API key** ← Create API key (בפרויקט Google Cloud חדש).
2. **הגבלת המפתח** (מומלץ): [console.cloud.google.com](https://console.cloud.google.com) ← APIs & Services ← Credentials ← המפתח ← API restrictions ← **Generative Language API** בלבד.
3. **תזכורת:** במסלול החינמי, הקלט עשוי לשמש לאימון. **רק נתונים פיקטיביים.**

## 6. OpenRouter (גיבוי)

1. [openrouter.ai](https://openrouter.ai) ← Keys ← Create key.
2. הגדירי מגבלת אשראי נמוכה למפתח (Credit limit), כדי שלא יהיו הפתעות.
3. את המודל עצמו נבחר בשלב 7 לפי הערכת האיכות.

## 7. סודות מקומיים

צרי שלושה ערכים אקראיים (בטרמינל, כל שורה בנפרד):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # CRON_SECRET
node -e "console.log(require('crypto').randomBytes(6).toString('hex'))"          # REP_ACCESS_CODE
```
**ערכים שונים ל-dev ול-prod.**

## 8. `.env.local`

```bash
cp .env.example .env.local
```
פתחי את `.env.local` **בעצמך** ב-VS Code ומלאי (Supabase **dev**). את `AI_SECOND_FALLBACK_MODEL` השאירי ריק בינתיים.

בדיקה:
```bash
npm run dev
```
פתחי [localhost:3000](http://localhost:3000): "יועץ הרכב" מימין לשמאל.

## 9. Vercel

1. [vercel.com](https://vercel.com) ← כניסה עם GitHub ← **Add New ← Project** ← ייבוא `strauss-car-advisor`.
2. Framework: Next.js (זיהוי אוטומטי). Root: `./`. **Deploy.**
3. האזור נקבע מ-`vercel.json` (`fra1`). בדיקה: Project ← Settings ← Functions ← Region.
4. **Settings ← Environment Variables**: בשלב 0 אין צורך. החל משלב 2:
   - **Production** ← ערכי Supabase **prod**
   - **Preview** ← ערכי Supabase **dev**
   - ערכי `NEXT_PUBLIC_*` משני הסוגים לפי הסביבה
5. בדיקה: הכתובת `https://strauss-car-advisor-<...>.vercel.app` מציגה את עמוד השלד.

## 10. Claude Code

1. ב-VS Code: **File ← Open Folder** ← תיקיית הפרויקט. פתחי את Claude Code (סמל Claude בסרגל).
2. כשנשאלת אם לסמוך על התיקייה (trust): כן. בלי זה, הרשאות הפרויקט לא נטענות.
3. **בדיקת ההגנה על הסודות:** כתבי ל-Claude: "קרא את הקובץ .env.local". הבקשה אמורה להיחסם. אם לא נחסמה, עצרי ובדקי ש-`.claude/settings.json` קיים.
4. הוסיפי את הכלים לפי [TOOLS.md](./TOOLS.md).
5. הפקודה הראשונה:
   ```
   /status
   ```
   ואז סגרי את שלב 0 (משימות S0-T7 עד S0-T11) ו:
   ```
   /close-stage
   ```

## בדיקה סופית של שלב 0

- [ ] `npm run check` ו-`npm run build` עוברים מקומית
- [ ] CI ירוק ב-GitHub
- [ ] דחיפה ישירה ל-`main` נחסמת
- [ ] כתובת Vercel עובדת
- [ ] Claude Code לא קורא את `.env.local`
- [ ] `/mcp` מציג את Context7 (ו-Supabase אם התקנת)
