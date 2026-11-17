// server/services/analytics/pdrb-analytics.ts
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  EXPENDITURE_COMPONENT_LABELS,
  formatLapusLabel,
  getPdrb17GroupForKbli,
  KBLI_IMPACT_LABELS,
  KbliCategoryEnum,
  KbliImpactEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
} from '../../../shared/enums/pdrb';
import {
  formatDateId,
  formatPeriodLabel,
  getPreviousQuarterYear,
  toRomanQuarter,
  type PdrbQuarter,
} from '../../../shared/utils/period';

export interface AnalyticsArticleRow {
  id: string;
  title: string;
  summary: string | null;
  sourcePortal: string;
  url: string;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
  secondaryKbliCategory?: KbliCategoryEnum | null;
  secondaryKbliImpact?: KbliImpactEnum | null;
  secondaryExpenditureComponent?: ExpenditureComponentEnum | null;
  secondaryExpenditureImpact?: ExpenditureImpactEnum | null;
  publishedAt: Date | string;
  quarter: number;
  year: number;
}

export interface QuarterYearPair {
  quarter: PdrbQuarter;
  year: number;
}

/**
 * Menghasilkan rangkaian `count` triwulan berurutan dari terlama ke target (`targetYear`, `targetQuarter`).
 */
export function buildQuarterSeries(
  targetQuarter: PdrbQuarter,
  targetYear: number,
  totalQuarters = 8,
): QuarterYearPair[] {
  const reversed: QuarterYearPair[] = [{ quarter: targetQuarter, year: targetYear }];
  let cursor: QuarterYearPair = { quarter: targetQuarter, year: targetYear };
  for (let i = 1; i < totalQuarters; i++) {
    cursor = getPreviousQuarterYear(cursor.quarter, cursor.year);
    reversed.push(cursor);
  }
  return reversed.reverse();
}

function getTopMapKey<K extends string>(counts: Map<K, number>): K | null {
  let topKey: K | null = null;
  let topVal = -1;
  for (const [k, v] of counts.entries()) {
    if (v > topVal) {
      topVal = v;
      topKey = k;
    }
  }
  return topKey;
}

export function computeDashboardAnalytics(params: {
  periodArticles: ReadonlyArray<AnalyticsArticleRow>;
  prevTotalVerified: number;
  pendingQueueCount: number;
  llmFailedCount: number;
  availableYears: number[];
  year: number;
  quarter: PdrbQuarter;
}) {
  const {
    periodArticles,
    prevTotalVerified,
    pendingQueueCount,
    llmFailedCount,
    availableYears,
    year,
    quarter,
  } = params;

  const prevPeriod = getPreviousQuarterYear(quarter, year);
  const totalVerifiedPeriod = periodArticles.length;
  const deltaPercent =
    prevTotalVerified > 0
      ? Math.round(((totalVerifiedPeriod - prevTotalVerified) / prevTotalVerified) * 1000) / 10
      : null;

  let increaseNtbCount = 0;
  for (const art of periodArticles) {
    if (art.kbliImpact === KbliImpactEnum.INCREASE_NTB) {
      increaseNtbCount += 1;
    }
  }
  const expansionPercent =
    totalVerifiedPeriod > 0 ? Math.round((increaseNtbCount / totalVerifiedPeriod) * 100) : 0;

  const sectorStatsMap = new Map<
    string,
    {
      count: number;
      primaryCount: number;
      secondaryCount: number;
      impacts: Map<KbliImpactEnum, number>;
      latestHeadline: string | null;
      latestPublishedAt: string | null;
      heatmapCells: Record<ExpenditureComponentEnum, number>;
    }
  >();

  for (const sector of PDRB_17_SECTORS) {
    sectorStatsMap.set(sector.groupCode, {
      count: 0,
      primaryCount: 0,
      secondaryCount: 0,
      impacts: new Map(),
      latestHeadline: null,
      latestPublishedAt: null,
      heatmapCells: {
        [ExpenditureComponentEnum.PK_RT]: 0,
        [ExpenditureComponentEnum.PK_LNPRT]: 0,
        [ExpenditureComponentEnum.PK_P]: 0,
        [ExpenditureComponentEnum.PMTB]: 0,
        [ExpenditureComponentEnum.INVENTORY_CHANGE]: 0,
        [ExpenditureComponentEnum.NET_EXPORT]: 0,
      },
    });
  }

  for (const art of periodArticles) {
    let primaryGroupCode: string | null = null;
    if (art.kbliCategory) {
      const group = getPdrb17GroupForKbli(art.kbliCategory);
      primaryGroupCode = group.groupCode;
      const bucket = sectorStatsMap.get(group.groupCode);
      if (bucket) {
        bucket.count += 1;
        bucket.primaryCount += 1;
        if (art.kbliImpact) {
          bucket.impacts.set(art.kbliImpact, (bucket.impacts.get(art.kbliImpact) ?? 0) + 1);
        }
        if (!bucket.latestHeadline) {
          bucket.latestHeadline = art.title;
          bucket.latestPublishedAt =
            art.publishedAt instanceof Date ? art.publishedAt.toISOString() : String(art.publishedAt);
        }
        if (art.expenditureComponent) {
          bucket.heatmapCells[art.expenditureComponent] =
            (bucket.heatmapCells[art.expenditureComponent] ?? 0) + 1;
        }
      }
    }

    // Inter-industry secondary linkage
    if (art.secondaryKbliCategory) {
      const secGroup = getPdrb17GroupForKbli(art.secondaryKbliCategory);
      if (secGroup.groupCode !== primaryGroupCode) {
        const secBucket = sectorStatsMap.get(secGroup.groupCode);
        if (secBucket) {
          secBucket.count += 1;
          secBucket.secondaryCount += 1;
          if (art.secondaryKbliImpact) {
            secBucket.impacts.set(
              art.secondaryKbliImpact,
              (secBucket.impacts.get(art.secondaryKbliImpact) ?? 0) + 1,
            );
          }
          if (!secBucket.latestHeadline) {
            secBucket.latestHeadline = art.title;
            secBucket.latestPublishedAt =
              art.publishedAt instanceof Date ? art.publishedAt.toISOString() : String(art.publishedAt);
          }
        }
      }
    }
  }

  const gapTiles = PDRB_17_SECTORS.map((sector) => {
    const bucket = sectorStatsMap.get(sector.groupCode)!;
    const sharePercent =
      totalVerifiedPeriod > 0
        ? Math.round((bucket.count / totalVerifiedPeriod) * 1000) / 10
        : 0;
    return {
      groupCode: sector.groupCode,
      shortName: sector.shortName,
      officialName: sector.officialName,
      kbliCodes: [...sector.kbliCodes],
      primaryKbliCode: sector.kbliCodes[0]!,
      count: bucket.count,
      primaryCount: bucket.primaryCount,
      secondaryCount: bucket.secondaryCount,
      sharePercent,
      isGap: bucket.count === 0,
      isThin: bucket.count > 0 && bucket.count <= 2,
      dominantImpact: getTopMapKey(bucket.impacts),
      latestHeadline: bucket.latestHeadline,
      latestPublishedAt: bucket.latestPublishedAt,
    };
  });

  const gapSectorCodes = gapTiles.filter((t) => t.isGap).map((t) => t.groupCode);
  const coveredSectors = PDRB_17_SECTORS.length - gapSectorCodes.length;

  const heatmapMatrix = PDRB_17_SECTORS.map((sector) => {
    const bucket = sectorStatsMap.get(sector.groupCode)!;
    return {
      groupCode: sector.groupCode,
      shortName: sector.shortName,
      totalCount: bucket.count,
      cells: { ...bucket.heatmapCells },
    };
  });

  return {
    period: {
      year,
      quarter,
      label: formatPeriodLabel(quarter, year),
      previousYear: prevPeriod.year,
      previousQuarter: prevPeriod.quarter,
      previousLabel: formatPeriodLabel(prevPeriod.quarter, prevPeriod.year),
    },
    kpi: {
      totalVerifiedPeriod,
      previousTotalVerified: prevTotalVerified,
      deltaPercent,
      coveredSectors,
      totalSectors: PDRB_17_SECTORS.length,
      gapSectorsCount: gapSectorCodes.length,
      pendingQueueCount,
      llmFailedCount,
      expansionPercent,
    },
    gapTiles,
    gapSectorCodes,
    heatmapMatrix,
    availableYears,
  };
}

export function computeTrendAnalytics(params: {
  mode: 'qoq' | 'yoy';
  dimension: 'kbli' | 'expenditure';
  targetYear: number;
  targetQuarter: PdrbQuarter;
  baselineYear: number;
  baselineQuarter: PdrbQuarter;
  historyQuarters: QuarterYearPair[];
  historyArticles: ReadonlyArray<AnalyticsArticleRow>;
  availableYears: number[];
}) {
  const {
    mode,
    dimension,
    targetYear,
    targetQuarter,
    baselineYear,
    baselineQuarter,
    historyQuarters,
    historyArticles,
    availableYears,
  } = params;

  const periodBuckets = new Map<
    string,
    { total: number; increaseNtb: number; decreaseNtb: number; pricePressure: number }
  >();
  for (const q of historyQuarters) {
    periodBuckets.set(`${q.year}-${q.quarter}`, {
      total: 0,
      increaseNtb: 0,
      decreaseNtb: 0,
      pricePressure: 0,
    });
  }

  const currentArticles: AnalyticsArticleRow[] = [];
  const baselineArticles: AnalyticsArticleRow[] = [];

  for (const art of historyArticles) {
    const key = `${art.year}-${art.quarter}`;
    const pBucket = periodBuckets.get(key);
    if (pBucket) {
      pBucket.total += 1;
      if (art.kbliImpact === KbliImpactEnum.INCREASE_NTB) {
        pBucket.increaseNtb += 1;
      } else if (art.kbliImpact === KbliImpactEnum.DECREASE_NTB) {
        pBucket.decreaseNtb += 1;
      } else if (
        art.kbliImpact === KbliImpactEnum.INCREASE_PRICE ||
        art.kbliImpact === KbliImpactEnum.DECREASE_PRICE
      ) {
        pBucket.pricePressure += 1;
      }
    }

    if (art.year === targetYear && art.quarter === targetQuarter) {
      currentArticles.push(art);
    }
    if (art.year === baselineYear && art.quarter === baselineQuarter) {
      baselineArticles.push(art);
    }
  }

  const history8Quarters = historyQuarters.map((q) => {
    const stats = periodBuckets.get(`${q.year}-${q.quarter}`)!;
    return {
      year: q.year,
      quarter: q.quarter,
      label: formatPeriodLabel(q.quarter, q.year),
      shortLabel: `TW ${toRomanQuarter(q.quarter)} '${String(q.year).slice(-2)}`,
      total: stats.total,
      increaseNtb: stats.increaseNtb,
      decreaseNtb: stats.decreaseNtb,
      pricePressure: stats.pricePressure,
      isTarget: q.year === targetYear && q.quarter === targetQuarter,
    };
  });

  const currentTotal = currentArticles.length;
  const baselineTotal = baselineArticles.length;
  const deltaCount = currentTotal - baselineTotal;
  const deltaPercent =
    baselineTotal > 0 ? Math.round((deltaCount / baselineTotal) * 1000) / 10 : null;

  const rows =
    dimension === 'kbli'
      ? PDRB_17_SECTORS.map((sector) => {
          const codeSet = new Set(sector.kbliCodes);
          const cur = currentArticles.filter(
            (a) =>
              (a.kbliCategory !== null && codeSet.has(a.kbliCategory)) ||
              (a.secondaryKbliCategory != null && codeSet.has(a.secondaryKbliCategory)),
          );
          const base = baselineArticles.filter(
            (a) =>
              (a.kbliCategory !== null && codeSet.has(a.kbliCategory)) ||
              (a.secondaryKbliCategory != null && codeSet.has(a.secondaryKbliCategory)),
          );
          const impactFreq = new Map<KbliImpactEnum, number>();
          let curIncrease = 0;
          let curDecrease = 0;
          for (const a of cur) {
            const imp = a.kbliImpact || a.secondaryKbliImpact;
            if (imp) {
              impactFreq.set(imp, (impactFreq.get(imp) ?? 0) + 1);
            }
            if (a.kbliImpact === KbliImpactEnum.INCREASE_NTB || a.secondaryKbliImpact === KbliImpactEnum.INCREASE_NTB) {
              curIncrease++;
            } else if (a.kbliImpact === KbliImpactEnum.DECREASE_NTB || a.secondaryKbliImpact === KbliImpactEnum.DECREASE_NTB) {
              curDecrease++;
            }
          }

          let baseIncrease = 0;
          let baseDecrease = 0;
          for (const a of base) {
            if (a.kbliImpact === KbliImpactEnum.INCREASE_NTB || a.secondaryKbliImpact === KbliImpactEnum.INCREASE_NTB) {
              baseIncrease++;
            } else if (a.kbliImpact === KbliImpactEnum.DECREASE_NTB || a.secondaryKbliImpact === KbliImpactEnum.DECREASE_NTB) {
              baseDecrease++;
            }
          }

          const curShare = currentTotal > 0 ? Math.round((cur.length / currentTotal) * 1000) / 10 : 0;
          const baseShare = baselineTotal > 0 ? Math.round((base.length / baselineTotal) * 1000) / 10 : 0;
          const deltaShare = Math.round((curShare - baseShare) * 10) / 10;
          const nbi = cur.length > 0 ? Math.round(((curIncrease - curDecrease) / cur.length) * 100) : null;
          const baseNbi = base.length > 0 ? Math.round(((baseIncrease - baseDecrease) / base.length) * 100) : null;

          const deltaRow = cur.length - base.length;
          const deltaRowPercent =
            base.length > 0 ? Math.round((deltaRow / base.length) * 1000) / 10 : null;

          return {
            code: sector.groupCode,
            label: sector.shortName,
            officialLabel: sector.officialName,
            kbliCodes: [...sector.kbliCodes],
            currentCount: cur.length,
            baselineCount: base.length,
            deltaCount: deltaRow,
            deltaPercent: deltaRowPercent,
            currentSharePercent: curShare,
            baselineSharePercent: baseShare,
            deltaSharePercent: deltaShare,
            netBalanceIndex: nbi,
            baselineNetBalanceIndex: baseNbi,
            dominantImpact: getTopMapKey(impactFreq),
            latestHeadline: cur[0]?.title ?? null,
            isGap: cur.length === 0,
          };
        })
      : PDRB_6_EXPENDITURE_LIST.map((comp) => {
          const cur = currentArticles.filter(
            (a) =>
              a.expenditureComponent === comp.code ||
              a.secondaryExpenditureComponent === comp.code,
          );
          const base = baselineArticles.filter(
            (a) =>
              a.expenditureComponent === comp.code ||
              a.secondaryExpenditureComponent === comp.code,
          );
          const impactFreq = new Map<ExpenditureImpactEnum, number>();
          let curIncrease = 0;
          let curDecrease = 0;
          for (const a of cur) {
            const imp = a.expenditureImpact || a.secondaryExpenditureImpact;
            if (imp) {
              impactFreq.set(imp, (impactFreq.get(imp) ?? 0) + 1);
            }
            if (
              a.expenditureImpact === ExpenditureImpactEnum.INCREASE_REAL ||
              a.secondaryExpenditureImpact === ExpenditureImpactEnum.INCREASE_REAL
            ) {
              curIncrease++;
            } else if (
              a.expenditureImpact === ExpenditureImpactEnum.DECREASE_REAL ||
              a.secondaryExpenditureImpact === ExpenditureImpactEnum.DECREASE_REAL
            ) {
              curDecrease++;
            }
          }

          let baseIncrease = 0;
          let baseDecrease = 0;
          for (const a of base) {
            if (
              a.expenditureImpact === ExpenditureImpactEnum.INCREASE_REAL ||
              a.secondaryExpenditureImpact === ExpenditureImpactEnum.INCREASE_REAL
            ) {
              baseIncrease++;
            } else if (
              a.expenditureImpact === ExpenditureImpactEnum.DECREASE_REAL ||
              a.secondaryExpenditureImpact === ExpenditureImpactEnum.DECREASE_REAL
            ) {
              baseDecrease++;
            }
          }

          const curShare = currentTotal > 0 ? Math.round((cur.length / currentTotal) * 1000) / 10 : 0;
          const baseShare = baselineTotal > 0 ? Math.round((base.length / baselineTotal) * 1000) / 10 : 0;
          const deltaShare = Math.round((curShare - baseShare) * 10) / 10;
          const nbi = cur.length > 0 ? Math.round(((curIncrease - curDecrease) / cur.length) * 100) : null;
          const baseNbi = base.length > 0 ? Math.round(((baseIncrease - baseDecrease) / base.length) * 100) : null;

          const deltaRow = cur.length - base.length;
          const deltaRowPercent =
            base.length > 0 ? Math.round((deltaRow / base.length) * 1000) / 10 : null;

          return {
            code: comp.code,
            label: comp.short,
            officialLabel: comp.official,
            currentCount: cur.length,
            baselineCount: base.length,
            deltaCount: deltaRow,
            deltaPercent: deltaRowPercent,
            currentSharePercent: curShare,
            baselineSharePercent: baseShare,
            deltaSharePercent: deltaShare,
            netBalanceIndex: nbi,
            baselineNetBalanceIndex: baseNbi,
            dominantImpact: getTopMapKey(impactFreq),
            latestHeadline: cur[0]?.title ?? null,
            isGap: cur.length === 0,
          };
        });

  const positiveMovers = [...rows]
    .filter((r) => r.deltaCount > 0)
    .sort((a, b) => b.deltaCount - a.deltaCount);
  const negativeMovers = [...rows]
    .filter((r) => r.deltaCount < 0)
    .sort((a, b) => a.deltaCount - b.deltaCount);

  return {
    mode,
    dimension,
    period: {
      year: targetYear,
      quarter: targetQuarter,
      label: formatPeriodLabel(targetQuarter, targetYear),
      shortLabel: `TW ${toRomanQuarter(targetQuarter)} '${String(targetYear).slice(-2)}`,
    },
    baseline: {
      year: baselineYear,
      quarter: baselineQuarter,
      label: formatPeriodLabel(baselineQuarter, baselineYear),
      shortLabel: `TW ${toRomanQuarter(baselineQuarter)} '${String(baselineYear).slice(-2)}`,
    },
    kpi: {
      currentTotal,
      baselineTotal,
      deltaCount,
      deltaPercent,
      topRiser: positiveMovers[0] ?? null,
      topDecliner: negativeMovers[0] ?? null,
      gapCount: rows.filter((r) => r.isGap).length,
    },
    history8Quarters,
    rows,
    availableYears,
  };
}

export function resolveSynthesisTargetLabel(
  dimension: 'kbli' | 'expenditure',
  targetCode: string,
): string {
  if (dimension === 'kbli') {
    const sector = PDRB_17_SECTORS.find((s) => s.groupCode === targetCode);
    return sector ? formatLapusLabel(sector.groupCode, sector.officialName) : `KBLI ${targetCode}`;
  }
  const exp = EXPENDITURE_COMPONENT_LABELS[targetCode as ExpenditureComponentEnum];
  return exp ? exp.official : targetCode;
}

/**
 * Fallback naratif BRS deterministik yang 100% berakar pada artikel terpilih apabila Gemini API
 * tidak tersedia / kuota habis, tanpa pernah mengarang angka makro baru.
 */
export function buildGroundedBrsFallbackNarrative(params: {
  periodLabel: string;
  dimension: 'kbli' | 'expenditure';
  targetCode: string;
  style: 'BRS_FORMAL' | 'EXECUTIVE_BRIEF' | 'BULLET_POINTS';
  articles: ReadonlyArray<AnalyticsArticleRow>;
}): string {
  const { periodLabel, dimension, targetCode, style, articles } = params;
  const targetLabel = resolveSynthesisTargetLabel(dimension, targetCode);
  const total = articles.length;

  const positiveItems: Array<{ idx: number; art: AnalyticsArticleRow }> = [];
  const contractionItems: Array<{ idx: number; art: AnalyticsArticleRow }> = [];
  const priceItems: Array<{ idx: number; art: AnalyticsArticleRow }> = [];

  articles.forEach((art, idx) => {
    const item = { idx: idx + 1, art };
    const isExpDim = dimension === 'expenditure';
    if (isExpDim) {
      if (art.expenditureImpact === ExpenditureImpactEnum.INCREASE_REAL) {
        positiveItems.push(item);
      } else if (art.expenditureImpact === ExpenditureImpactEnum.DECREASE_REAL) {
        contractionItems.push(item);
      } else {
        priceItems.push(item);
      }
    } else {
      if (art.kbliImpact === KbliImpactEnum.INCREASE_NTB) {
        positiveItems.push(item);
      } else if (art.kbliImpact === KbliImpactEnum.DECREASE_NTB) {
        contractionItems.push(item);
      } else {
        priceItems.push(item);
      }
    }
  });

  const citeList = (list: Array<{ idx: number; art: AnalyticsArticleRow }>) =>
    list
      .slice(0, 6)
      .map(
        ({ idx, art }) =>
          `${art.summary?.trim() || art.title} [${idx}] (${art.sourcePortal}, ${formatDateId(art.publishedAt)})`,
      );

  const uniquePortals = Array.from(new Set(articles.map((a) => a.sourcePortal))).join(', ');

  if (style === 'BULLET_POINTS') {
    const bullets = articles.map((art, i) => {
      const impactText = art.kbliImpact
        ? KBLI_IMPACT_LABELS[art.kbliImpact]
        : 'Fenomena Terverifikasi';
      return `- **${impactText}** — ${art.summary?.trim() || art.title} [${i + 1}]`;
    });

    return [
      `## Butir-Butir Fenomena: ${targetLabel} (${periodLabel})`,
      '',
      `Basis data terkurasi: **${total} bukti fenomena terverifikasi** di Kabupaten Tana Tidung dari sumber ${uniquePortals}.`,
      '',
      ...bullets,
      '',
      '## Catatan Metodologis Nerwilis',
      `Seluruh butir di atas merangkum sinyal fenomena kualitatif terkurasi untuk mendukung interpretasi pertumbuhan PDRB ${periodLabel}.`,
    ].join('\n');
  }

  if (style === 'EXECUTIVE_BRIEF') {
    const leadCitations = articles
      .slice(0, 3)
      .map((_, i) => `[${i + 1}]`)
      .join('');
    const highlights = citeList(
      positiveItems.length > 0
        ? positiveItems
        : articles.map((art, idx) => ({ idx: idx + 1, art })),
    );

    return [
      `## Ringkasan Eksekutif: ${targetLabel} (${periodLabel})`,
      '',
      `Pada periode **${periodLabel}**, terekam **${total} bukti fenomena terverifikasi** pada ${targetLabel} yang bersumber dari ${uniquePortals} ${leadCitations}. Dari keseluruhan bukti tersebut, tercatat **${positiveItems.length} sinyal ekspansi riil/NTB**, **${contractionItems.length} sinyal perlambatan**, dan **${priceItems.length} sinyal pergerakan harga/deflator**.`,
      '',
      '## Sinyal Lapangan Utama',
      ...highlights.map((h) => `- ${h}`),
      '',
      '## Implikasi Rekonsiliasi PDRB',
      'Temuan fenomena media regional & nasional ini digunakan sebagai catatan pendukung justifikasi arah pertumbuhan triwulanan saat rekonsiliasi bersama Tim Nerwilis BPS Kabupaten Tana Tidung.',
    ].join('\n');
  }

  // BRS_FORMAL default
  const sections: string[] = [
    `## Fenomena Pendorong Kinerja ${targetLabel}`,
    '',
  ];

  if (positiveItems.length > 0) {
    sections.push(
      `Berdasarkan pemantauan ${total} berita ekonomi terverifikasi pada **${periodLabel}** di Kabupaten Tana Tidung, dinamika ${targetLabel} ditopang oleh **${positiveItems.length} indikasi peningkatan aktivitas ekonomi riil/NTB**. ${citeList(positiveItems).join(' ')}`,
    );
  } else {
    sections.push(
      `Berdasarkan pemantauan **${total} bukti fenomena terverifikasi** pada **${periodLabel}**, catatan dinamika ${targetLabel} di Kabupaten Tana Tidung tersaji dalam poin-poin kejadian berikut: ${citeList(articles.map((art, idx) => ({ idx: idx + 1, art }))).join(' ')}`,
    );
  }

  sections.push('');
  sections.push('## Dinamika Harga, Tantangan & Risiko Lapangan');
  sections.push('');

  const pressureCombined = [...contractionItems, ...priceItems];
  if (pressureCombined.length > 0) {
    sections.push(
      `Di sisi lain, terdapat **${contractionItems.length} indikasi kontraksi/perlambatan** dan **${priceItems.length} sinyal perubahan tingkat harga/deflator** yang perlu dicermati pada penghitungan komponen terkait. ${citeList(pressureCombined).join(' ')}`,
    );
  } else {
    sections.push(
      `Pada sampel ${total} berita terverifikasi periode **${periodLabel}**, tidak ditemukan indikasi kontraksi aktivitas maupun gejolak harga signifikan yang berlawanan dengan tren ekspansi utama.`,
    );
  }

  sections.push('');
  sections.push('## Catatan Konsistensi Data Nerwilis');
  sections.push('');
  sections.push(
    `Narasi ini disusun berdasarkan **${total} artikel terverifikasi** (sumber: ${uniquePortals}) tanpa menambahkan angka pertumbuhan kuantitatif di luar hasil survei dan penghitungan resmi BPS Kabupaten Tana Tidung.`,
  );

  return sections.join('\n');
}

