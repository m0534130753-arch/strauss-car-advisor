---
description: Self-check the current task against the Definition of Done before marking it complete
---

Verify the current task honestly. Do not mark anything done that you have not seen pass.

1. Run `npm run check` and show the summary lines (lint result, typecheck result, test counts).
2. If the task touched `src/app`, `next.config.ts`, env handling or dependencies, run `npm run build` and show the result.
3. If the task touched `src/server/domain`, run `npm run test:coverage` and report branch coverage for `src/server/domain`.
4. Re-read the task's acceptance criteria in `docs/ROADMAP.md`. For EACH criterion, state ✅ or ❌ and the evidence (test name, command output, or file:line).
5. Walk through the golden rules in `CLAUDE.md` one by one against the diff (`git diff main...HEAD`). Report any violation.
6. Review the diff for: dead code, leftover console.log, `any`, untracked TODOs, secrets, salary values in logs, files outside the task's scope.
7. Output a table in Hebrew: | בדיקה | תוצאה | ראיה |
8. If everything passes: update `docs/ROADMAP.md` (check the task, add a progress-log row with date and what was verified), commit with a Conventional Commit message, and tell the user it is ready for push/PR. Do not push.
9. If anything fails: list what failed and the fix plan. Do NOT check the task in the roadmap.
