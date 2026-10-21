---
description: Pick the next task from the roadmap and plan it (no code until approved)
---

1. Run `git status` and `git branch --show-current`. If the tree is not clean, STOP and report what is uncommitted.
2. Read `docs/ROADMAP.md`. Find the current stage (the first stage whose gate is not closed) and its first unchecked task. If the previous stage's gate is not closed, STOP and say so: we never start a stage before the previous gate closes.
3. Read only the sections of `docs/ARCHITECTURE.md` that the task references, plus `CLAUDE.md` golden rules.
4. If the task uses a library API you are not 100% sure about in its current version (Next.js 16, AI SDK 7, zod 4, Drizzle, Supabase), check `node_modules/next/dist/docs/` or use context7 now, before planning.
5. Present, in Hebrew:
   - Task ID and goal (one line)
   - Branch name to create: `s<stage>/t<task>-<short-name>`
   - Files to create/change
   - Tests to write first (if domain/security)
   - Acceptance criteria copied from the roadmap, as a checklist
   - Risks or open questions (if any decision in ARCHITECTURE.md seems wrong or missing, say so here)
6. WAIT for explicit approval. Do not create the branch or write code before the user approves.

$ARGUMENTS
