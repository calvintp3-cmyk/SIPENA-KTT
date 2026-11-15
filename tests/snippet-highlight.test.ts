import { describe, expect, it } from 'vitest';
import { parseEconomicSnippetSegments } from '../app/utils/snippetHighlight';

describe('parseEconomicSnippetSegments', () => {
  it('returns empty array for empty text', () => {
    expect(parseEconomicSnippetSegments('')).toEqual([]);
  });

  it('highlights Tana Tidung locations and economic metrics accurately', () => {
    const input =
      'Pembangunan di Tideng Pale, Kabupaten Tana Tidung menelan anggaran Rp 12,5 miliar dengan progres 40% dan luas 25 hektar.';
    const segments = parseEconomicSnippetSegments(input);

    const locations = segments.filter((s) => s.kind === 'location').map((s) => s.text);
    const metrics = segments.filter((s) => s.kind === 'metric').map((s) => s.text);

    expect(locations).toEqual(['Tideng Pale', 'Kabupaten Tana Tidung']);
    expect(metrics).toEqual(['Rp 12,5 miliar', '40%', '25 hektar']);
    expect(segments.map((s) => s.text).join('')).toBe(input);
  });

  it('preserves HTML-like characters as plain text without mangling', () => {
    const input = 'Harga <script>alert(1)</script> naik 5 persen di Sesayap.';
    const segments = parseEconomicSnippetSegments(input);
    expect(segments.map((s) => s.text).join('')).toBe(input);
    expect(segments.some((s) => s.kind === 'metric' && s.text === '5 persen')).toBe(true);
    expect(segments.some((s) => s.kind === 'location' && s.text === 'Sesayap')).toBe(true);
  });
});
