export interface HighlightSegment {
  text: string;
  kind: 'plain' | 'location' | 'metric';
}

const LOCATION_PATTERN =
  /\b(?:Kabupaten\s+Tana\s+Tidung|Tana\s+Tidung|Tideng\s+Pale|Sesayap(?:\s+Hilir)?|Tana\s+Lia|Betayau|Muruk\s+Rian|Kalimantan\s+Utara|Kaltara|KTT)\b/gi;

const METRIC_PATTERN =
  /(?:Rp\.?\s*\d[\d.,]*(?:\s*(?:juta|miliar|triliun|ribu))?|\b\d+(?:[.,]\d+)?(?:\s*%|\s+(?:persen|ton|hektar|ha|km|unit|paket|ekor|liter|kg)\b))/gi;

const COMBINED_PATTERN = new RegExp(
  `(${LOCATION_PATTERN.source})|(${METRIC_PATTERN.source})`,
  'gi',
);

/**
 * Splits raw article text into typed segments (plain, location, metric)
 * so Vue can render highlighted spans safely without v-html or XSS risks.
 */
export function parseEconomicSnippetSegments(text: string): HighlightSegment[] {
  if (!text) return [];

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  COMBINED_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = COMBINED_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        kind: 'plain',
      });
    }

    const matchedText = match[0];
    const kind: HighlightSegment['kind'] = match[1] ? 'location' : 'metric';
    segments.push({ text: matchedText, kind });
    lastIndex = COMBINED_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      kind: 'plain',
    });
  }

  return segments;
}
