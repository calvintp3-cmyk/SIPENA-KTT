import fs from "node:fs";
import dotenv from "dotenv";

for (const envFile of [".env.production", ".env.local", ".env"]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

import { pool } from "../src/db";
import { runAiExtractionPipeline } from "../src/lib/ai/extract-phenomenon";

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Memulai SIPENA-KTT AI extraction job...`);

  const summary = await runAiExtractionPipeline({
    batchSize: 30,
    concurrency: 3,
  });

  console.log(
    `[${new Date().toISOString()}] AI extraction selesai:`,
    JSON.stringify(summary, null, 2)
  );
}

main()
  .catch((err) => {
    console.error("[FATAL] Cron extract gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

