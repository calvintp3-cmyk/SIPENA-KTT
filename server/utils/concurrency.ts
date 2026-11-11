// server/utils/concurrency.ts
export const DEFAULT_SCRAPER_CONCURRENCY = 5;

/**
 * Menjalankan async handler pada sekumpulan item secara paralel dengan batas konkurensi tetap.
 * Menghentikan pengambilan item baru secara bersih apabila AbortSignal dipicu, sembari
 * menunggu tugas yang sedang berjalan menyelesaikan abort/cleanup.
 */
export async function runWithConcurrency<T>(
  items: ReadonlyArray<T>,
  limit: number,
  handler: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  if (items.length === 0 || signal?.aborted) {
    return;
  }

  const safeLimit = Math.max(1, Math.floor(limit) || DEFAULT_SCRAPER_CONCURRENCY);
  const workerCount = Math.min(safeLimit, items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (!signal?.aborted) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) {
          break;
        }
        const item = items[index];
        if (item !== undefined) {
          await handler(item, index);
        }
      }
    }),
  );
}

