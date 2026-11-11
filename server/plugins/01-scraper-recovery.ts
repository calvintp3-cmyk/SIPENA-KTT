// server/plugins/01-scraper-recovery.ts
import { defineNitroPlugin } from 'nitropack/runtime';
import { recoverOrphanedRunningLogs } from '../services/scraper/pipeline';

export default defineNitroPlugin(() => {
  void recoverOrphanedRunningLogs(
    'Server dimulai ulang sebelum sesi crawler sebelumnya selesai; status dipulihkan otomatis.',
  )
    .then((recovered) => {
      if (recovered > 0) {
        console.warn(`[Scraper Recovery] Memulihkan ${recovered} log RUNNING yatim saat startup.`);
      }
    })
    .catch((err) => {
      console.warn(
        '[Scraper Recovery] Lewati pemulihan log startup:',
        err instanceof Error ? err.message : String(err),
      );
    });
});

