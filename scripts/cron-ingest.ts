import fs from "node:fs";
import dotenv from "dotenv";

for (const envFile of [".env.production", ".env.local", ".env"]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

import { pool } from "../src/db";
import { runIngestionPipeline } from "../src/lib/scrapers";

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Memulai SIPENA-KTT daily ingestion job...`);

  const summary = await runIngestionPipeline({
    maxArticlesPerSource: 20,
  });

  console.log(
    `[${new Date().toISOString()}] Ingestion selesai:`,
    JSON.stringify(summary, null, 2)
  );
}

main()
  .catch((err) => {
    console.error("[FATAL] Cron ingest gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

