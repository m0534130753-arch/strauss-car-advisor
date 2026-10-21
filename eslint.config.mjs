import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer boundaries (docs/ARCHITECTURE.md, decision 22).
// A forbidden import is a lint ERROR, so the architecture is enforced, not just documented.
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // domain: pure business logic. Imports only itself.
  {
    files: ["src/server/domain/**/*.ts"],
    rules: restrict([
      {
        group: ["@/*", "!@/server", "@/server/*", "!@/server/domain", "!@/server/domain/**"],
        message: "domain may import only from src/server/domain.",
      },
      {
        group: ["next", "next/*", "react", "react/*", "zod", "ai", "@ai-sdk/*", "@supabase/*", "drizzle-orm", "drizzle-orm/*", "postgres", "server-only"],
        message: "domain must stay framework- and vendor-free (pure TypeScript).",
      },
    ]),
  },

  // application: orchestrates domain + ports. Never touches adapters or Next.js.
  {
    files: ["src/server/application/**/*.ts"],
    rules: restrict([
      { group: ["@/server/adapters", "@/server/adapters/**", "@/server/container"], message: "application talks to ports, not adapters." },
      { group: ["@/app/**", "@/components/**", "next", "next/*", "react", "react/*"], message: "application must not depend on UI or Next.js." },
      { group: ["@supabase/*", "drizzle-orm", "drizzle-orm/*", "postgres"], message: "persistence belongs in adapters." },
    ]),
  },

  // adapters: implement ports. Never import use cases or UI.
  {
    files: ["src/server/adapters/**/*.ts"],
    rules: restrict([
      { group: ["@/server/application", "@/server/application/**", "@/app/**", "@/components/**"], message: "adapters implement ports; they must not import application or UI." },
    ]),
  },

  // components: browser code. Never import server code.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: restrict([
      { group: ["@/server", "@/server/**"], message: "components run in the browser; use src/contracts and API routes." },
    ]),
  },

  // app routes: go through application + container, never adapters directly.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: restrict([
      { group: ["@/server/adapters", "@/server/adapters/**"], message: "routes use the container and application layer, not adapters directly." },
    ]),
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", "drizzle/**"]),
]);

export default eslintConfig;
