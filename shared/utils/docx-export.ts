// shared/utils/docx-export.ts
// Zero-dependency genuine OOXML (.docx) exporter using IEEE CRC32 & STORE PKZIP
import { parseBrsMarkdown, type BrsInlineSpan, type BrsMarkdownBlock } from '#shared/utils/markdown-brs';

export interface DocxCitationEntry {
  index: number;
  title: string;
  sourcePortal: string;
  publishedAtText: string;
  url?: string;
}

export interface BuildSynthesisDocxInput {
  title: string;
  periodLabel: string;
  subtitle?: string;
  markdown: string;
  citations: DocxCitationEntry[];
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderRunXml(
  text: string,
  opts?: { bold?: boolean; italic?: boolean; sizeHalfPt?: number; colorHex?: string; vertAlign?: 'superscript' },
): string {
  const rPrParts: string[] = ['<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'];
  if (opts?.bold) rPrParts.push('<w:b/>');
  if (opts?.italic) rPrParts.push('<w:i/>');
  if (opts?.sizeHalfPt) rPrParts.push(`<w:sz w:val="${opts.sizeHalfPt}"/><w:szCs w:val="${opts.sizeHalfPt}"/>`);
  if (opts?.colorHex) rPrParts.push(`<w:color w:val="${opts.colorHex}"/>`);
  if (opts?.vertAlign === 'superscript') rPrParts.push('<w:vertAlign w:val="superscript"/>');

  return `<w:r><w:rPr>${rPrParts.join('')}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function renderSpansToWordRuns(spans: BrsInlineSpan[], baseBold = false): string {
  return spans
    .map((span) => {
      if (span.type === 'bold') {
        return renderRunXml(span.text, { bold: true, sizeHalfPt: 22, colorHex: '0F172A' });
      }
      if (span.type === 'italic') {
        return renderRunXml(span.text, { bold: baseBold, italic: true, sizeHalfPt: 22, colorHex: '334155' });
      }
      if (span.type === 'code') {
        return renderRunXml(span.text, { bold: baseBold, sizeHalfPt: 20, colorHex: '1E293B' });
      }
      if (span.type === 'cite') {
        return renderRunXml(span.text, {
          bold: true,
          sizeHalfPt: 18,
          colorHex: '3730A3',
          vertAlign: 'superscript',
        });
      }
      if (span.type === 'link') {
        return renderRunXml(span.text, { bold: baseBold, sizeHalfPt: 22, colorHex: '1D4ED8' });
      }
      return renderRunXml(span.text, { bold: baseBold, sizeHalfPt: 22, colorHex: '0F172A' });
    })
    .join('');
}

function renderBlockToWordXml(block: BrsMarkdownBlock): string {
  switch (block.type) {
    case 'heading': {
      const sz = block.level === 1 ? 30 : block.level === 2 ? 26 : 23;
      const runs = block.spans
        .map((s) =>
          renderRunXml(s.text, {
            bold: true,
            sizeHalfPt: sz,
            colorHex: '0F172A',
          }),
        )
        .join('');
      return `<w:p><w:pPr><w:spacing w:before="220" w:after="100"/><w:keepNext/></w:pPr>${runs}</w:p>`;
    }
    case 'paragraph':
      return `<w:p><w:pPr><w:spacing w:after="140" w:line="320" w:lineRule="auto"/></w:pPr>${renderSpansToWordRuns(block.spans)}</w:p>`;
    case 'bullet_list':
      return block.items
        .map(
          (spans) =>
            `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr>${renderRunXml('• ', { bold: true, sizeHalfPt: 22, colorHex: '1D4ED8' })}${renderSpansToWordRuns(spans)}</w:p>`,
        )
        .join('');
    case 'ordered_list':
      return block.items
        .map(
          (item) =>
            `<w:p><w:pPr><w:ind w:left="480" w:hanging="280"/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr>${renderRunXml(`${item.order}. `, { bold: true, sizeHalfPt: 22, colorHex: '0F172A' })}${renderSpansToWordRuns(item.spans)}</w:p>`,
        )
        .join('');
    case 'blockquote':
      return block.paragraphs
        .map(
          (p) =>
            `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="12" w:color="4F46E5"/></w:pBdr><w:ind w:left="420"/><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>${renderSpansToWordRuns(p, false)}</w:p>`,
        )
        .join('');
    case 'table': {
      const headerCells = block.headers
        .map(
          (h) =>
            `<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${renderSpansToWordRuns(h, true)}</w:p></w:tc>`,
        )
        .join('');
      const bodyRows = block.rows
        .map(
          (row) =>
            `<w:tr>${row
              .map(
                (cell) =>
                  `<w:tc><w:p><w:pPr><w:spacing w:before="50" w:after="50"/></w:pPr>${renderSpansToWordRuns(cell)}</w:p></w:tc>`,
              )
              .join('')}</w:tr>`,
        )
        .join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/><w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tblBorders></w:tblPr><w:tr>${headerCells}</w:tr>${bodyRows}</w:tbl><w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
    }
  }
}

function buildDocumentXml(input: BuildSynthesisDocxInput): string {
  const blocks = parseBrsMarkdown(input.markdown);
  const bodyBlocksXml = blocks.map(renderBlockToWordXml).join('');

  const subtitleText = input.subtitle || 'BPS Kabupaten Tana Tidung • Fungsi Nerwilis';
  const headerXml = [
    `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${renderRunXml(subtitleText, { bold: true, sizeHalfPt: 18, colorHex: '3730A3' })}</w:p>`,
    `<w:p><w:pPr><w:spacing w:after="100"/></w:pPr>${renderRunXml(input.title, { bold: true, sizeHalfPt: 34, colorHex: '0F172A' })}</w:p>`,
    `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="8" w:color="CBD5E1"/></w:pBdr><w:spacing w:after="200"/></w:pPr>${renderRunXml(`Periode Analisis: ${input.periodLabel}`, { sizeHalfPt: 20, colorHex: '475569' })}</w:p>`,
  ].join('');

  const citationsSectionXml =
    input.citations.length > 0
      ? [
          `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="8" w:color="CBD5E1"/></w:pBdr><w:spacing w:before="240" w:after="120"/><w:keepNext/></w:pPr>${renderRunXml('Daftar Sumber Berita Terverifikasi', { bold: true, sizeHalfPt: 26, colorHex: '0F172A' })}</w:p>`,
          ...input.citations.map((c) => {
            const urlSuffix = c.url ? ` — ${c.url}` : '';
            const line = `[${c.index}] ${c.title} (${c.sourcePortal}, ${c.publishedAtText})${urlSuffix}`;
            return `<w:p><w:pPr><w:ind w:left="360" w:hanging="360"/><w:spacing w:after="70" w:line="280" w:lineRule="auto"/></w:pPr>${renderRunXml(line, { sizeHalfPt: 19, colorHex: '334155' })}</w:p>`;
          }),
        ].join('')
      : '';

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<w:body>',
    headerXml,
    bodyBlocksXml,
    citationsSectionXml,
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join('');
}

const CONTENT_TYPES_XML = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
  '<Default Extension="xml" ContentType="application/xml"/>',
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
  '</Types>',
].join('');

const ROOT_RELS_XML = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
  '</Relationships>',
].join('');

const DOCUMENT_RELS_XML = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
].join('');

// Precomputed IEEE 802.3 CRC32 lookup table
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntrySpec {
  name: string;
  data: Uint8Array;
}

function buildStoreZip(entries: ZipEntrySpec[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const entryCrc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local File Header (30 bytes + filename)
    const lfh = new ArrayBuffer(30);
    const lfhView = new DataView(lfh);
    lfhView.setUint32(0, 0x04034b50, true); // signature
    lfhView.setUint16(4, 20, true); // version needed (2.0)
    lfhView.setUint16(6, 0x0800, true); // UTF-8 flag
    lfhView.setUint16(8, 0, true); // compression STORE (0)
    lfhView.setUint16(10, 0, true); // mod time
    lfhView.setUint16(12, 0x5421, true); // mod date (2022-01-01 valid DOS date)
    lfhView.setUint32(14, entryCrc, true);
    lfhView.setUint32(18, size, true);
    lfhView.setUint32(22, size, true);
    lfhView.setUint16(26, nameBytes.length, true);
    lfhView.setUint16(28, 0, true); // extra field len

    localParts.push(new Uint8Array(lfh), nameBytes, dataBytes);

    // Central Directory Header (46 bytes + filename)
    const cdh = new ArrayBuffer(46);
    const cdhView = new DataView(cdh);
    cdhView.setUint32(0, 0x02014b50, true);
    cdhView.setUint16(4, 20, true); // version made by
    cdhView.setUint16(6, 20, true); // version needed
    cdhView.setUint16(8, 0x0800, true); // UTF-8 flag
    cdhView.setUint16(10, 0, true); // compression STORE
    cdhView.setUint16(12, 0, true); // mod time
    cdhView.setUint16(14, 0x5421, true); // mod date
    cdhView.setUint32(16, entryCrc, true);
    cdhView.setUint32(20, size, true);
    cdhView.setUint32(24, size, true);
    cdhView.setUint16(28, nameBytes.length, true);
    cdhView.setUint16(30, 0, true); // extra len
    cdhView.setUint16(32, 0, true); // comment len
    cdhView.setUint16(34, 0, true); // disk start
    cdhView.setUint16(36, 0, true); // internal attrs
    cdhView.setUint32(38, 0, true); // external attrs
    cdhView.setUint32(42, offset, true); // relative offset of local header

    centralParts.push(new Uint8Array(cdh), nameBytes);
    offset += 30 + nameBytes.length + size;
  }

  let centralSize = 0;
  for (const part of centralParts) centralSize += part.length;

  const eocd = new ArrayBuffer(22);
  const eocdView = new DataView(eocd);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = offset + centralSize + 22;
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(new Uint8Array(eocd), cursor);
  return output;
}

export function buildSynthesisDocxBytes(input: BuildSynthesisDocxInput): Uint8Array {
  const encoder = new TextEncoder();
  const documentXml = buildDocumentXml(input);

  return buildStoreZip([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(DOCUMENT_RELS_XML) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
  ]);
}

