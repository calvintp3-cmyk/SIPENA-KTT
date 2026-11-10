import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sipena_ktt",
  },
  verbose: true,
  strict: true,
});
