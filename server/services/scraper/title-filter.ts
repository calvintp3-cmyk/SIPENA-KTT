// server/services/scraper/title-filter.ts

const HARD_NOISE_PATTERNS: RegExp[] = [
  /\b(hasil\s+pertandingan|skor\s+akhir|prediksi\s+skor|klasemen\s+sementara|liga\s+1|champions\s+league)\b/i,
  /\b(jadwal\s+sholat|jadwal\s+imsakiyah|jadwal\s+bola|siaran\s+langsung|link\s+live\s+streaming)\b/i,
  /\b(ramalan\s+zodiak|shio\s+hari\s+ini|sinopsis\s+film|spoiler\s+drakor)\b/i,
  /\b(profil\s+artis|gosip\s+selebriti|pesugihan|tebak\s+gambar)\b/i,
  /\b(prakiraan\s+cuaca\s+harian)\b/i,
];

/**
 * Penyaringan deterministik berbasis judul khusus untuk penjaringan berita NASIONAL
 * agar hemat token LLM. Portal regional Kabupaten Tana Tidung TIDAK pernah disaring
 * di tahap ini untuk mencegah false negative (sesuai docs/architecture.md §3.1).
 */
export function isHardNoiseTitleForNational(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) return true;
  return HARD_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

