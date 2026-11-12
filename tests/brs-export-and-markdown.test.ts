// tests/brs-export-and-markdown.test.ts
import { describe, expect, it } from 'vitest';
import {
  parseBrsMarkdown,
  renderSafeBrsHtml,
  tokenizeBrsInline,
} from '#shared/utils/markdown-brs';
import { buildSynthesisDocxBytes } from '#shared/utils/docx-export';

describe('BRS Markdown parser & citation tokenizer', () => {
  it('parses headings, bullet/ordered lists, blockquotes, GFM tables, and multi-citations safely', () => {
    const md = [
      '## Ringkasan Sektoral',
      'Produksi **TBS sawit** *meningkat* signifikan [1, 2] pada kawasan pesisir [1-3].',
      '',
      '- Harga TBS naik 12% [1]',
      '- Ekspor kayu olahan tumbuh [2]',
      '',
      '1. Pengiriman jalur laut stabil [1]',
      '2. Infrastruktur pelabuhan dipercepat [3]',
      '',
      '> Catatan Nerwilis: Data lapangan tervalidasi lintas sumber [2].',
      '',
      '| Indikator | Arah | Sumber |',
      '| --- | --- | --- |',
      '| Harga TBS | Naik | [1] |',
      '| Volume Angkut | Naik | [2, 3] |',
    ].join('\n');

    const blocks = parseBrsMarkdown(md);
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'bullet_list',
      'ordered_list',
      'blockquote',
      'table',
    ]);

    const heading = blocks[0]!;
    expect(heading.type).toBe('heading');
    if (heading.type === 'heading') {
      expect(heading.level).toBe(2);
    }

    const para = blocks[1]!;
    expect(para.type).toBe('paragraph');
    if (para.type === 'paragraph') {
      const cites = para.spans.filter((s) => s.type === 'cite').map((s) => s.citeNum);
      // [1, 2] -> [1, 2], [1-3] -> [1, 2, 3]
      expect(cites).toEqual([1, 2, 1, 2, 3]);
      expect(para.spans.some((s) => s.type === 'bold' && s.text === 'TBS sawit')).toBe(true);
      expect(para.spans.some((s) => s.type === 'italic' && s.text === 'meningkat')).toBe(true);
    }

    const ordered = blocks[3]!;
    expect(ordered.type).toBe('ordered_list');
    if (ordered.type === 'ordered_list') {
      expect(ordered.items).toHaveLength(2);
      expect(ordered.items[0]!.order).toBe(1);
      expect(ordered.items[1]!.order).toBe(2);
    }

    const table = blocks[5]!;
    expect(table.type).toBe('table');
    if (table.type === 'table') {
      expect(table.headers).toHaveLength(3);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[1]![2]!.filter((s) => s.type === 'cite').map((s) => s.citeNum)).toEqual([
        2, 3,
      ]);
    }
  });

  it('does not tokenize markdown links as citations and strictly escapes dangerous HTML payloads', () => {
    const inline = tokenizeBrsInline('Lihat [BPS KTT](https://tanatidungkab.bps.go.id) [1]');
    expect(inline.filter((s) => s.type === 'cite')).toHaveLength(1);

    const xssMarkdown = '# Judul <script>alert(1)</script>\nParagraf <img src=x onerror="alert(2)"> [1]';
    const safeHtml = renderSafeBrsHtml(xssMarkdown);
    expect(safeHtml).not.toContain('<script>');
    expect(safeHtml).not.toContain('<img');
    expect(safeHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(safeHtml).toContain('&lt;img src=x onerror=&quot;alert(2)&quot;&gt;');
  });
});

describe('OOXML .docx generator (pure TypeScript PKZIP + WordprocessingML)', () => {
  it('builds a genuine ZIP archive with WordprocessingML headers, content, citations, and XML escaping', () => {
    const bytes = buildSynthesisDocxBytes({
      title: 'A - Pertanian & Perkebunan — TW III 2026',
      periodLabel: 'TW III 2026 (Juli–September)',
      subtitle: 'BPS Kabupaten Tana Tidung • Fungsi Nerwilis',
      markdown: [
        '## Perkembangan Sektor Pertanian',
        'Kenaikan harga **TBS** <uji> & ekspor komoditas [1, 2].',
        '',
        '1. Harga petani membaik [1]',
        '- Permintaan pabrik stabil [2]',
        '',
        '| Komoditas | Status |',
        '| --- | --- |',
        '| Sawit | Meningkat |',
      ].join('\n'),
      citations: [
        {
          index: 1,
          title: 'Harga Sawit Tana Tidung Menguat & Stabil',
          sourcePortal: 'Koran Kaltara',
          publishedAtText: '12 Agu 2026',
          url: 'https://example.com/berita-1?a=1&b=2',
        },
        {
          index: 2,
          title: 'Ekspor CPO Kaltara Meningkat',
          sourcePortal: 'Antara Kaltara',
          publishedAtText: '18 Agu 2026',
          url: 'https://example.com/berita-2',
        },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    // ZIP Local File Header magic PK\x03\x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);

    // Ends with End-of-Central-Directory signature PK\x05\x06 within last 64 bytes
    const tailText = new TextDecoder('latin1').decode(bytes.slice(-64));
    expect(tailText).toContain('PK\x05\x06');

    const fullAscii = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    expect(fullAscii).toContain('[Content_Types].xml');
    expect(fullAscii).toContain('_rels/.rels');
    expect(fullAscii).toContain('word/_rels/document.xml.rels');
    expect(fullAscii).toContain('word/document.xml');
    expect(fullAscii).toContain('Perkembangan Sektor Pertanian');
    expect(fullAscii).toContain('Harga Sawit Tana Tidung Menguat &amp; Stabil');
    expect(fullAscii).toContain('&lt;uji&gt; &amp; ekspor komoditas');
    expect(fullAscii).toContain('https://example.com/berita-1?a=1&amp;b=2');
  });
});

