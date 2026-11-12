// server/services/scraper/title-filter.ts

const HARD_NOISE_PATTERNS: RegExp[] = [
  /\b(hasil\s+pertandingan|skor\s+akhir|prediksi\s+skor|klasemen\s+sementara|liga\s+1|champions\s+league)\b/i,
  /\b(jadwal\s+sholat|jadwal\s+imsakiyah|jadwal\s+bola|siaran\s+langsung|link\s+live\s+streaming|jadwal\s+tv)\b/i,
  /\b(ramalan\s+zodiak|ramalan\s+bintang|shio\s+hari\s+ini|sinopsis\s+film|spoiler\s+drakor)\b/i,
  /\b(profil\s+artis|gosip\s+selebriti|pesugihan|tebak\s+gambar)\b/i,
  /\b(prakiraan\s+cuaca\s+harian)\b/i,
  /\b(kunci\s+jawaban|kode\s+redeem|twibbon|resep\s+masakan|lirik\s+lagu|kata[-\s]+kata\s+bijak)\b/i,
  /\b(?:grafik|chart|riwayat)\s+(?:data\s+)?historis\b/i,
  /^(?:cek|daftar|rincian)\s+(?:harga|tarif)\b.*\b(?:hari\s+ini|terbaru|seluruh\s+indonesia)\b/i,
  /\b(?:tarif\s+listrik|harga\s+bbm)\b.*\b(?:tetap|tidak\s+berubah|tak\s+berubah)\b/i,
  /\b(?:tetap|tidak\s+berubah|tak\s+berubah)\b.*\b(?:tarif\s+listrik|harga\s+bbm)\b/i,
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
