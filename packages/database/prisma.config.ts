import { defineConfig } from "prisma/config";

// Local-only default matches .env.example; real value comes from the root
// .env via the dotenv-cli wrappers in package.json scripts.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
