import { defineConfig } from "drizzle-kit";

// Migrations use the DIRECT connection (port 5432), not the transaction pooler.
// db:migrate loads .env.local via `node --env-file` (see package.json).
export default defineConfig({
  schema: "./src/server/adapters/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
