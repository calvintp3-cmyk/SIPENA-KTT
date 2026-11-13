// scripts/test-mixed-contention.mjs
import http from 'node:http';

const BASE_URL = process.env.TARGET_URL || 'http://127.0.0.1:3002';

function makeRequest(path) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = http.get(`${BASE_URL}${path}`, { timeout: 10_000 }, (res) => {
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
      });
      res.on('end', () => {
        const elapsed = performance.now() - t0;
        resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, elapsed, bytes });
      });
    });

    req.on('error', (err) => {
      const elapsed = performance.now() - t0;
      resolve({ ok: false, error: err.message, elapsed, bytes: 0 });
    });

    req.on('timeout', () => {
      req.destroy();
      const elapsed = performance.now() - t0;
      resolve({ ok: false, error: 'TIMEOUT', elapsed, bytes: 0 });
    });
  });
}

async function runMixedContentionTest() {
  console.log(`[Load Test] Memulai Mixed Sustained Resource Contention Test terhadap ${BASE_URL}...`);

  // Skenario gabungan: 50 request overview + 30 request articles filter + health check simultan (Total 80+ paralel)
  const tasks = [];

  // 1. Thread A: 40 request overview berulang
  for (let i = 0; i < 40; i++) {
    tasks.push(makeRequest('/api/public/overview'));
  }

  // 2. Thread B: 30 request articles dengan query filter dinamis
  for (let i = 0; i < 30; i++) {
    const kbli = ['A', 'B', 'C', 'F', 'G'][i % 5];
    tasks.push(makeRequest(`/api/public/articles?kbli=${kbli}&page=1&limit=10`));
  }

  // 3. Thread C: 10 request health check & metrics
  for (let i = 0; i < 10; i++) {
    tasks.push(makeRequest('/api/health'));
  }

  const tGlobalStart = performance.now();
  const results = await Promise.all(tasks);
  const totalElapsed = performance.now() - tGlobalStart;

  const successful = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const latencies = results.map((r) => r.elapsed).sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const max = latencies[latencies.length - 1];

  console.log('--- HASIL MIXED RESOURCE CONTENTION (80 REQUEST SIMULTAN) ---');
  console.log(`Total Requests : ${results.length}`);
  console.log(`Successful (200): ${successful}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Wall Clock Time: ${Math.round(totalElapsed)} ms`);
  console.log(`Latency p50    : ${Math.round(p50)} ms`);
  console.log(`Latency p95    : ${Math.round(p95)} ms`);
  console.log(`Latency Max    : ${Math.round(max)} ms`);

  if (failed > 0) {
    console.error('ERROR: Terdapat request yang gagal selama perebutan sumber daya!');
    process.exit(1);
  } else {
    console.log('SUCCESS: Kolam koneksi database dan server berhasil melayani seluruh 80 request paralel tanpa deadlock!');
  }
}

runMixedContentionTest();

