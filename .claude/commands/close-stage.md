---
description: Run the stage gate. A stage closes only when every gate item passes.
---

1. Identify the current stage in `docs/ROADMAP.md`. Confirm every task in it is checked. If not, list the unchecked tasks and STOP.
2. Run `npm run check` and `npm run build`. Show results.
3. Go through EACH item in the stage's gate checklist. For each one: run the command or test that proves it, or, if it is a manual check (UI, Supabase dashboard, Vercel), give the user exact steps to verify and ask them to confirm.
4. Output a gate table in Hebrew: | פריט בשער | עבר? | ראיה |
5. Only if ALL items pass and the user confirmed the manual ones:
   - Check the gate items, set the stage status to ✅ in the status table
   - Add a progress-log row: date, stage closed, summary of evidence
   - Commit `chore(roadmap): close stage N`
   - Suggest the PR title and description (use .github/pull_request_template.md)
6. If any item fails: do not change the stage status. List the failures and the tasks needed to fix them.
