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

// ============================================================================
// REFERENSI MASTER WILAYAH BPS & KEMENDAGRI (SIG BRIDGING CODE BPS 6503 / 65.04)
// ============================================================================

// 5 Kecamatan Resmi Kabupaten Tana Tidung
export const KTT_DISTRICTS = [
  'sesayap',
  'sesayap hilir',
  'tana lia',
  'betayau',
  'muruk rian',
] as const;

// 32 Desa Resmi di Kabupaten Tana Tidung (Master BPS 6503 / Kemendagri 65.04)
export const KTT_VILLAGES = [
  // 1. Kec. Sesayap (7 desa)
  'gunawan',
  'limbu sedulun',
  'sebawang',
  'sebidai',
  'sedulun',
  'tideng pale',
  'tideng pale timur',
  // 2. Kec. Sesayap Hilir (8 desa)
  'badan bikis',
  'bandan bikis',
  'bebatu',
  'menjelutung',
  'seludau',
  'sengkong',
  'sepala dalung',
  'sesayap',
  'sesayap selor',
  // 3. Kec. Tana Lia (5 desa)
  'sambungan',
  'sambungan selatan',
  'tanah merah',
  'tanah merah barat',
  'tengku dacing',
  // 4. Kec. Betayau (6 desa)
  'bebakung',
  'buong baru',
  'kujau',
  'maning',
  'mendupo',
  'periuk',
  // 5. Kec. Muruk Rian (6 desa)
  'belayan ari',
  'kapuak',
  'rian',
  'rian rayo',
  'sapari',
  'seputuk',
] as const;

// Jangkar geografis mutlak Kabupaten Tana Tidung (wilayah administratif, 5 kecamatan, 32 desa, ibukota, pelabuhan/dermaga resmi KTT)
export const KTT_ANCHOR_RE =
  /\b(?:tana\s*tidung|ktt|bumi\s+upun\s+taka|upun\s+taka|tideng\s*pale|puspem\s+ktt|sesayap(?:\s+hilir)?|tana\s+lia|betayau|muruk\s*rian|gunawan|limbu\s+sedulun|sebawang|sebidai|sedulun|tideng\s+pale(?:\s+timur)?|ba[n]?dan\s+bikis|bebatu|menjelutung|seludau|sengkong|sepala\s+dalung|sesayap\s+selor|sambungan(?:\s+selatan)?|tanah\s+merah(?:\s+barat)?|tengku\s+dacing|bebakung|buong\s+baru|kujau|maning|mendupo|periuk|belayan\s+ari|kapuak|rian(?:\s+rayo)?|sapari|seputuk|pelabuhan\s+(?:bebatu|sebawang|tideng\s+pale)|dermaga\s+(?:tideng\s+pale|sesayap)|sungai\s+sesayap|pemkab\s+(?:tana\s+tidung|ktt)|dprd\s+(?:tana\s+tidung|ktt)|rsud\s+akhmad\s+berahim|akhmad\s+berahim|pdam\s+tirta\s+taka|tirta\s+taka)\b/i;

// Koridor transportasi resmi yang menghubungkan Kab. Tana Tidung (Tideng Pale / Sebawang / Sesayap)
export const KTT_LOGISTICS_CORRIDOR_RE =
  /\b(?:speedboat\s+(?:tarakan[-–\s]+tideng\s+pale|tideng\s+pale[-–\s]+tarakan|tarakan[-–\s]+sesayap|sesayap[-–\s]+tarakan)|feri\s+(?:tarakan[-–\s]+sebawang|sebawang[-–\s]+tarakan|tarakan[-–\s]+ktt|tarakan[-–\s]+tana\s+tidung)|pelabuhan\s+sebawang|dermaga\s+tideng\s+pale)\b/i;

// Kebijakan/data makro tingkat Provinsi Kaltara yang bertransmisi ke seluruh kab/kota termasuk KTT
const KALTARA_PROVINCIAL_MACRO_RE =
  /\b(?:pemprov\s+kaltara|gubernur\s+kaltara|disbun\s+kaltara|disdikbud\s+kaltara|disperindagkop\s+kaltara|dishub\s+kaltara|bps\s+kaltara|bi\s+kaltara|dprd\s+kaltara|polda\s+kaltara|apbd\s+kaltara|se-kaltara|kalimantan\s+utara|kaltara)\b/i;

// Indikator/kebijakan makro acuan nasional yang memengaruhi unit ekonomi di KTT
const NATIONAL_MACRO_ANCHOR_RE =
  /\b(?:kementerian\s+esdm|kementerian\s+keuangan|kemenkeu|kementan|kemendag|kemenhub|kemenperin|bank\s+indonesia|bi\s+rate|apbn|hba\s+batubara|harga\s+batubara(?:\s+acuan)?|dana\s+bagi\s+hasil|transfer\s+ke\s+daerah|dana\s+alokasi|bbm\s+subsidi|ekspor\s+cpo|subsidi\s+pupuk|harga\s+acuan|harga\s+emas(?:\s+antam)?|emas\s+antam|logam\s+mulia|inflasi|deflasi|ihk|nilai\s+tukar\s+petani|kurs\s+rupiah|suku\s+bunga|tarif\s+dasar\s+listrik|elpiji\s+3\s*kg|lpg\s+3\s*kg|beras\s+sphp|cadangan\s+beras|bulog)\b/i;

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

  // 2. Jalur A: Ada jangkar eksplisit wilayah geografis atau koridor transportasi resmi Kab. Tana Tidung
  if (
    KTT_ANCHOR_RE.test(combinedText) ||
    KTT_LOGISTICS_CORRIDOR_RE.test(combinedText)
  ) {
    return {
      decision: 'ALLOW_KTT_ANCHOR',
      reason: 'Artikel menyebut langsung lokus geografis atau koridor transportasi resmi Kab. Tana Tidung.',
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

  // Artikel dari crawler REGIONAL yang ternyata tidak memuat jangkar KTT, kebijakan Kaltara, maupun indikator makro nasional
  if (
    input.sourceType === ArticleSourceTypeEnum.REGIONAL &&
    !KALTARA_PROVINCIAL_MACRO_RE.test(combinedText) &&
    !NATIONAL_MACRO_ANCHOR_RE.test(combinedText)
  ) {
    return {
      decision: 'DROP_OTHER_REGENCY_LOCAL',
      reason:
        'Kandidat portal regional tidak memuat penyebutan Kab. Tana Tidung, kebijakan tingkat Provinsi Kaltara, maupun indikator makro ekonomi nasional.',
    };
  }

  // 4. Jalur C: Artikel Kaltara lintas-daerah atau makro nasional diteruskan untuk evaluasi LLM
  return {
    decision: 'ALLOW_FOR_LLM_REVIEW',
    reason: 'Kandidat relevan di tingkat Provinsi Kalimantan Utara atau kebijakan makro nasional.',
  };
}

// ============================================================================
// 5 KECAMATAN RESMI KABUPATEN TANA TIDUNG & RESOLVER LOKUS
// ============================================================================

export const KTT_SUBDISTRICT_NAMES = [
  'Sesayap',
  'Sesayap Hilir',
  'Tana Lia',
  'Betayau',
  'Muruk Rian',
] as const;

export type KttSubdistrictName = (typeof KTT_SUBDISTRICT_NAMES)[number];

const SESAYAP_HILIR_RE =
  /\b(?:sesayap\s+hilir|sesayap\s+selor|bebatu|pelabuhan\s+bebatu|menjelutung|seludau|sengkong|sepala\s+dalung|ba[n]?dan\s+bikis)\b/i;

const TANA_LIA_RE =
  /\b(?:tana\s+lia|tanah\s+merah(?:\s+barat)?|tengku\s+dacing|sambungan(?:\s+selatan)?)\b/i;

const BETAYAU_RE =
  /\b(?:betayau|bebakung|buong\s+baru|kujau|maning|mendupo|periuk)\b/i;

const MURUK_RIAN_RE =
  /\b(?:muruk\s*rian|belayan\s+ari|kapuak|rian\s+rayo|sapari|seputuk|desa\s+rian)\b/i;

const SESAYAP_RE =
  /\b(?:sesayap(?!\s+(?:hilir|selor))|tideng\s*pale(?:\s+timur)?|sebawang|pelabuhan\s+sebawang|sedulun|limbu\s+sedulun|gunawan|sebidai|dermaga\s+tideng\s+pale|pusat\s+pemerintahan(?:\s+ktt)?|puspem(?:\s+ktt)?|rsud\s+akhmad\s+berahim|akhmad\s+berahim)\b/i;

const SUBDISTRICT_CONFIGS: Array<{
  name: KttSubdistrictName;
  regex: RegExp;
}> = [
  { name: 'Sesayap Hilir', regex: SESAYAP_HILIR_RE },
  { name: 'Tana Lia', regex: TANA_LIA_RE },
  { name: 'Betayau', regex: BETAYAU_RE },
  { name: 'Muruk Rian', regex: MURUK_RIAN_RE },
  { name: 'Sesayap', regex: SESAYAP_RE },
];

function countRegexMatches(text: string, regex: RegExp): number {
  if (!text) return 0;
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const matches = text.match(globalRegex);
  return matches ? matches.length : 0;
}

/**
 * Mendeteksi kecamatan spesifik (lokus) di Kabupaten Tana Tidung dari teks judul dan cuplikan berita
 * menggunakan Weighted Frequency Scoring: Judul diberi bobot 5x lebih tinggi dibanding naskah isi (1x)
 * untuk menghindari kesalahan deteksi akibat penyebutan selintas lokasi transit/pelabuhan.
 * Mengembalikan salah satu dari 5 nama kecamatan resmi, atau null jika berita berskala umum/makro.
 */
export function detectKttSubdistrict(
  title: string,
  snippetText?: string | null,
): KttSubdistrictName | null {
  const cleanTitle = (title || '').trim();
  const cleanSnippet = (snippetText || '').trim();
  if (!cleanTitle && !cleanSnippet) return null;

  let bestSubdistrict: KttSubdistrictName | null = null;
  let highestScore = 0;

  for (const cfg of SUBDISTRICT_CONFIGS) {
    const titleMatches = countRegexMatches(cleanTitle, cfg.regex);
    const snippetMatches = countRegexMatches(cleanSnippet, cfg.regex);
    const score = titleMatches * 5 + snippetMatches;

    if (score > highestScore) {
      highestScore = score;
      bestSubdistrict = cfg.name;
    }
  }

  return highestScore > 0 ? bestSubdistrict : null;
}

