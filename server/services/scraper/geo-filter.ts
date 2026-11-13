// server/services/scraper/geo-filter.ts
import { ArticleSourceTypeEnum } from '../../../shared/enums/pdrb';

export type GeographicFilterDecision =
  | 'ALLOW_KTT_ANCHOR'
  | 'ALLOW_FOR_LLM_REVIEW'
  | 'DROP_OTHER_REGENCY_LOCAL'
  | 'DROP_STATIC_NOISE';

export interface GeographicRelevanceResult {
  decision: GeographicFilterDecision;
  reason: string;
}

// Jangkar geografis mutlak Kabupaten Tana Tidung (kecamatan, ibu kota, ikon instansi lokal)
export const KTT_ANCHOR_RE =
  /\b(?:tana\s*tidung|tideng\s*pale|sesayap(?:\s+hilir)?|tana\s+lia|betayau|muruk\s*rian|sepala\s+dalung|buong\s+baru|bebatu|ktt|upun\s+taka|akhmad\s+berahim|tirta\s+taka|puspem\s+ktt)\b/i;

// Kebijakan/data makro tingkat Provinsi Kaltara yang bertransmisi ke seluruh kab/kota termasuk KTT
const KALTARA_PROVINCIAL_MACRO_RE =
  /\b(?:pemprov\s+kaltara|gubernur\s+kaltara|disbun\s+kaltara|disdikbud\s+kaltara|bps\s+kaltara|bi\s+kaltara|apbd\s+kaltara|se-kaltara|kalimantan\s+utara|kaltara)\b/i;

// Indikator/kebijakan makro acuan nasional yang memengaruhi unit ekonomi di KTT
const NATIONAL_MACRO_ANCHOR_RE =
  /\b(?:kementerian\s+esdm|kementerian\s+keuangan|kemenkeu|kementan|kemendag|kemenhub|kemenperin|bank\s+indonesia|bi\s+rate|apbn|hba\s+batubara|harga\s+batubara\s+acuan|dana\s+bagi\s+hasil|transfer\s+ke\s+daerah|dana\s+alokasi|bbm\s+subsidi|ekspor\s+cpo|subsidi\s+pupuk|harga\s+acuan)\b/i;

// Entitas lokal eksklusif kabupaten/kota tetangga di Kaltara atau Kaltim
const NEIGHBOR_LOCAL_REGENCY_RE =
  /\b(?:pemkab\s+nunukan|kabupaten\s+nunukan|nunukan|krayan|sebatik|pemkot\s+tarakan|kota\s+tarakan|tarakan|pemkab\s+bulungan|kabupaten\s+bulungan|tanjung\s+selor|bulungan|pemkab\s+malinau|kabupaten\s+malinau|malinau|pemkab\s+berau|berau|tanjung\s+redeb)\b/i;

// Entitas lokal eksklusif provinsi/kabupaten luar Kalimantan Utara
const OTHER_PROVINCE_LOCAL_RE =
  /\b(?:disbun\s+(?:riau|jambi|sumut|sumbar|aceh|kalteng|kalbar|kalsel|sumsel)|pemprov\s+(?:riau|jambi|jatim|jabar|jateng|kalteng|sumut|sulsel)|tanjung\s+perak|nagan\s+raya|pekanbaru|palangka\s+raya|pontianak|banjarmasin|medan|palembang|padang|lampung|bengkul[u]?|babel|bangka\s+belitung)\b/i;

// Segmen path URL milik subkanal kabupaten tetangga
const OTHER_REGENCY_URL_PATH_RE =
  /\/(?:nunukan|tarakan|bulungan|malinau|krayan|sebatik|berau|samarinda|balikpapan|kaltim)\//i;

// Pola berita urusan internal/kriminalitas/operasi perkotaan kabupaten tetangga tanpa relevansi ekonomi makro KTT
const NEIGHBOR_MUNICIPAL_NOISE_RE =
  /\b(?:razia|satpol\s+pp|pdam|futsal|curanmor|narkoba|pencurian|judi\s+online|judol|laka\s+lantas|lakalantas|kebakaran\s+rumah|tilang|polres\s+(?:tarakan|nunukan|bulungan|malinau)|polsek|pemkot\s+tarakan|dprd\s+tarakan|walikota\s+tarakan|pembunuhan|penganiayaan|balap\s+liar|lapas\s+tarakan)\b/i;

// Pola berita harga/tarif statis atau grafik data historis tanpa kejadian perubahan nyata
const STATIC_NOISE_PATTERNS: RegExp[] = [
  /^(?:cek|daftar|rincian)\s+(?:harga|tarif)\b.*\b(?:hari\s+ini|terbaru|seluruh\s+indonesia)\b/i,
  /\b(?:tarif\s+listrik|harga\s+bbm)\b.*\b(?:tetap|tidak\s+berubah|tak\s+berubah|stagnan)\b/i,
  /\b(?:tetap|tidak\s+berubah|tak\s+berubah|stagnan)\b.*\b(?:tarif\s+listrik|harga\s+bbm)\b/i,
  /\b(?:grafik|chart|riwayat)\s+(?:data\s+)?historis\b/i,
];

export function evaluateGeographicRelevance(input: {
  title: string;
  snippetText?: string | null;
  url?: string | null;
  sourceType: ArticleSourceTypeEnum;
  matchedKeyword?: string | null;
}): GeographicRelevanceResult {
  const title = input.title.trim();
  const snippet = (input.snippetText ?? '').trim();
  const url = (input.url ?? '').trim();
  const combinedText = `${title}\n${snippet}`;

  // 1. Cek pola tarif statis / grafik data historis (berlaku untuk non-KTT lokal & nasional)
  if (
    input.sourceType === ArticleSourceTypeEnum.NATIONAL &&
    STATIC_NOISE_PATTERNS.some((re) => re.test(title))
  ) {
    return {
      decision: 'DROP_STATIC_NOISE',
      reason: 'Judul menunjukkan data tarif/harga statis atau grafik historis tanpa perubahan peristiwa ekonomi.',
    };
  }

  // 2. Jalur A: Ada jangkar eksplisit Kabupaten Tana Tidung pada judul/isi
  if (KTT_ANCHOR_RE.test(combinedText)) {
    return {
      decision: 'ALLOW_KTT_ANCHOR',
      reason: 'Artikel menyebut langsung lokus Kabupaten Tana Tidung/kecamatan KTT.',
    };
  }

  // 3. Jalur B (Tolak): Tanpa jangkar KTT — saring operasi kota tetangga & urusan internal non-ekonomi
  if (NEIGHBOR_MUNICIPAL_NOISE_RE.test(combinedText)) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason:
        'Berita berkaitan dengan urusan internal kota/kabupaten lain (Tarakan/Nunukan/Bulungan), razia, kriminalitas, atau fasilitas perkotaan tanpa keterkaitan ekonomi KTT.',
    };
  }

  // Periksa entitas lokal daerah/provinsi lain
  if (OTHER_PROVINCE_LOCAL_RE.test(combinedText) && !NATIONAL_MACRO_ANCHOR_RE.test(combinedText)) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason: 'Artikel berfokus pada entitas lokal provinsi lain di luar Kalimantan Utara tanpa keterkaitan dengan KTT.',
    };
  }

  if (
    OTHER_REGENCY_URL_PATH_RE.test(url) &&
    !KALTARA_PROVINCIAL_MACRO_RE.test(title)
  ) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason: 'URL berita berada di subkanal kabupaten/kota lain tanpa menyebut Kab. Tana Tidung.',
    };
  }

  if (
    NEIGHBOR_LOCAL_REGENCY_RE.test(combinedText) &&
    !/\b(?:pemprov\s+kaltara|gubernur\s+kaltara|disbun\s+kaltara|disdikbud\s+kaltara|bps\s+kaltara|bi\s+kaltara|apbd\s+kaltara|se-kaltara|lima\s+kabupaten\s+kota\s+kaltara)\b/i.test(
      combinedText,
    )
  ) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason: 'Berita khusus kabupaten/kota tetangga (Nunukan/Tarakan/Bulungan/Malinau) tanpa kaitan langsung ke KTT.',
    };
  }

  // Artikel dari crawler REGIONAL yang ternyata tidak memuat jangkar KTT maupun kebijakan Kaltara
  if (
    input.sourceType === ArticleSourceTypeEnum.REGIONAL &&
    !KALTARA_PROVINCIAL_MACRO_RE.test(combinedText)
  ) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason: 'Kandidat portal regional tidak memuat penyebutan Kab. Tana Tidung maupun kebijakan tingkat Provinsi Kaltara.',
    };
  }

  // 4. Jalur C: Artikel Kaltara lintas-daerah atau makro nasional diteruskan untuk evaluasi LLM
  return {
    decision: 'ALLOW_FOR_LLM_REVIEW',
    reason: 'Kandidat relevan di tingkat Provinsi Kalimantan Utara atau kebijakan makro nasional.',
  };
}
