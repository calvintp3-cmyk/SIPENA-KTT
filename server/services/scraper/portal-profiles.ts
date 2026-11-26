// server/services/scraper/portal-profiles.ts

export interface PortalExtractionProfile {
  id: string;
  hostPatterns: ReadonlyArray<RegExp>;
  /** Selector kontainer isi berita spesifik dari yang paling presisi */
  contentSelectors: ReadonlyArray<string>;
  /** Selector elemen di dalam/sekitar kontainer yang wajib dibuang sebelum ekstraksi paragraf */
  removeSelectors: ReadonlyArray<string>;
}

export const PORTAL_EXTRACTION_PROFILES: ReadonlyArray<PortalExtractionProfile> = [
  {
    id: 'jawapos-network',
    hostPatterns: [/(?:^|\.)jawapos\.com$/i],
    contentSelectors: [
      'div.konten div.artikel div.ui-r-my',
      'div.konten div.artikel',
      'div.konten',
      '.read__content',
    ],
    removeSelectors: [
      '[data-ad-slot]',
      '[id^="home-ad-"]',
      'figure',
      'figcaption',
      '.ui-r-mb.group',
      'button',
      '.tagging',
    ],
  },
  {
    id: 'tribun-network',
    hostPatterns: [/(?:^|\.)tribunnews\.com$/i],
    contentSelectors: [
      'div.side-article.txt-article.multi-fontsize',
      'div.side-article.txt-article',
      '.txt-article',
    ],
    removeSelectors: [
      '.baca-juga',
      '.bacajuga',
      '.tribcomment-form',
      '.tribcomment-overlay',
      '.separator.apps',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'koran-kaltara',
    hostPatterns: [/(?:^|\.)korankaltara\.com$/i],
    contentSelectors: [
      'div.news-content.prose',
      '.news-content',
    ],
    removeSelectors: [
      'figure',
      'figcaption',
      '.share-buttons',
    ],
  },
  {
    id: 'benuanta',
    hostPatterns: [/(?:^|\.)benuanta\.co\.id$/i],
    contentSelectors: [
      'div.entry-content.entry-content-single',
      'div.entry-content',
    ],
    removeSelectors: [
      '.jeg_post_tags',
      '.jeg_share_button',
      '.related-posts',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'antara-network',
    hostPatterns: [/(?:^|\.)antaranews\.com$/i],
    contentSelectors: [
      'div.wrap__article-detail-content.post-content',
      'div.post-content',
      '.wrap__article-detail-content',
    ],
    removeSelectors: [
      '.baca-juga',
      '.tags',
      '.share-wrapper',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'jnews-regional',
    hostPatterns: [/(?:^|\.)(?:fokusborneo\.com|focusborneo\.com|headlinews\.id)$/i],
    contentSelectors: [
      'div.entry-content div.content-inner',
      'div.content-inner',
      'div.entry-content.no-share',
    ],
    removeSelectors: [
      '.jeg_featured',
      '.jeg_post_tags',
      '.jeg_share_button',
      '.jeg_ad',
      '.jeg_postblock',
      '.footer_widget',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'niaga-asia',
    hostPatterns: [/(?:^|\.)niaga\.asia$/i],
    contentSelectors: [
      'article.post div.entry-content',
      'div.entry-content',
    ],
    removeSelectors: [
      '.sharedaddy',
      '.jp-relatedposts',
      '.post-tags',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'metrokaltara',
    hostPatterns: [/(?:^|\.)metrokaltara\.com$/i],
    contentSelectors: [
      'div.inner-post-entry.entry-content',
      'div.post-entry',
    ],
    removeSelectors: [
      '.post-comments',
      '.comment-form',
      '.penci-single-link-pages',
      '.penci-post-box-meta',
      '.theiaStickySidebar .widget',
      '.footer-widget-wrapper',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'rri-portal',
    hostPatterns: [/(?:^|\.)rri\.co\.id$/i],
    contentSelectors: [
      'div.post_details_block',
      '.details_block3',
    ],
    removeSelectors: [
      'figure',
      'figcaption',
      '.share-box',
    ],
  },
  {
    id: 'national-major-portals',
    hostPatterns: [
      /(?:^|\.)(?:detik\.com|kompas\.com|cnbcindonesia\.com|cnnindonesia\.com|kontan\.co\.id|bisnis\.com|tempo\.co|sindonews\.com|republika\.co\.id|mediaindonesia\.com|liputan6\.com|okezone\.com|kumparan\.com|suara\.com|idntimes\.com|katadata\.co\.id|bloombergtechnoz\.com|investor\.id|wartaekonomi\.co\.id|infosawit\.com)$/i,
    ],
    contentSelectors: [
      '.detail__body-text',
      '.read__content',
      '.txt-detail',
      '.detail-konten',
      '.article-content-body__item-content',
      '.read__article',
      '.detail-text',
      '.article__content',
      'div[itemprop="articleBody"]',
      '.entry-content',
      '.post-content',
    ],
    removeSelectors: [
      '.detail__body-tag',
      '.paradetail',
      '.sisip_embed_sosmed',
      '.linksisip',
      '.baca-juga',
      '.bacajuga',
      '.inner-link-baca-juga',
      '.comp-baca-juga',
      '.box-terkait',
      '.artikel-terkait',
      '.berita-terkait',
      '[data-ad-slot]',
      'figure',
      'figcaption',
    ],
  },
];

export function matchPortalExtractionProfile(
  rawUrl?: string | null,
  explicitHostname?: string | null,
): PortalExtractionProfile | null {
  let host = (explicitHostname ?? '').trim().toLowerCase();
  if (!host && rawUrl) {
    try {
      host = new URL(rawUrl).hostname.toLowerCase();
    } catch {
      host = '';
    }
  }
  if (!host) return null;
  const cleanHost = host.replace(/^www\./, '');

  for (const profile of PORTAL_EXTRACTION_PROFILES) {
    if (profile.hostPatterns.some((re) => re.test(cleanHost) || re.test(host))) {
      return profile;
    }
  }
  return null;
}
