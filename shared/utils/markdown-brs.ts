// shared/utils/markdown-brs.ts

export interface BrsInlineSpan {
  type: 'text' | 'bold' | 'italic' | 'code' | 'cite' | 'link';
  text: string;
  citeNum?: number;
  href?: string;
}

export type BrsMarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; spans: BrsInlineSpan[] }
  | { type: 'paragraph'; spans: BrsInlineSpan[] }
  | { type: 'bullet_list'; items: BrsInlineSpan[][] }
  | { type: 'ordered_list'; items: Array<{ order: number; spans: BrsInlineSpan[] }> }
  | { type: 'blockquote'; paragraphs: BrsInlineSpan[][] }
  | { type: 'table'; headers: BrsInlineSpan[][]; rows: BrsInlineSpan[][][] };

function sanitizeHref(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function expandCitationList(inner: string): number[] | null {
  const parts = inner
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const numbers: number[] = [];
  for (const part of parts) {
    const rangeMatch = /^(\d{1,4})\s*[-–]\s*(\d{1,4})$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start >= 1 && end >= start && end - start <= 15) {
        for (let n = start; n <= end; n++) numbers.push(n);
        continue;
      }
      return null;
    }
    if (/^\d{1,4}$/.test(part)) {
      const num = Number(part);
      if (num >= 1) {
        numbers.push(num);
        continue;
      }
    }
    return null;
  }
  return numbers.length > 0 ? numbers : null;
}

export function tokenizeBrsInline(line: string): BrsInlineSpan[] {
  const spans: BrsInlineSpan[] = [];
  // Order matters: markdown links before citation brackets; bold ** before italic * / _; inline code `...`
  const tokenRegex =
    /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`|\[[^\]]+\]\([^)]+\)|\[(?:\d{1,4}(?:\s*[-–,]\s*\d{1,4})*)\](?!\())/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    }

    const token = match[0];

    if (token.startsWith('**') && token.endsWith('**')) {
      spans.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      spans.push({ type: 'italic', text: token.slice(1, -1) });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      spans.push({ type: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1] ?? '';
        const href = sanitizeHref(linkMatch[2] ?? '');
        if (href) {
          spans.push({ type: 'link', text: label, href });
        } else {
          spans.push({ type: 'text', text: label });
        }
      } else {
        spans.push({ type: 'text', text: token });
      }
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const nums = expandCitationList(token.slice(1, -1));
      if (nums && nums.length > 0) {
        nums.forEach((citeNum, idx) => {
          if (idx > 0) {
            spans.push({ type: 'text', text: ' ' });
          }
          spans.push({ type: 'cite', text: `[${citeNum}]`, citeNum });
        });
      } else {
        spans.push({ type: 'text', text: token });
      }
    } else {
      spans.push({ type: 'text', text: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    spans.push({ type: 'text', text: line.slice(lastIndex) });
  }

  return spans;
}

function isTableDividerLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);
}

function splitTableCells(line: string): string[] {
  const stripped = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return stripped.split('|').map((c) => c.trim());
}

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line.trim());
}

function isOrderedLine(line: string): boolean {
  return /^\d+[.)]\s+/.test(line.trim());
}

function isBlockquoteLine(line: string): boolean {
  return /^>\s?/.test(line.trim());
}

function isHeadingLine(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

export function parseBrsMarkdown(markdown: string): BrsMarkdownBlock[] {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: BrsMarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Heading
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const hashes = headingMatch[1]!.length;
      const level = (hashes <= 1 ? 1 : hashes === 2 ? 2 : 3) as 1 | 2 | 3;
      blocks.push({
        type: 'heading',
        level,
        spans: tokenizeBrsInline(headingMatch[2]!.trim()),
      });
      i++;
      continue;
    }

    // 2. GFM Table (header + divider row)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableDividerLine(lines[i + 1] ?? '')
    ) {
      const rawHeaders = splitTableCells(line);
      const headers = rawHeaders.map((cell) => tokenizeBrsInline(cell));
      i += 2;
      const rows: BrsInlineSpan[][][] = [];
      while (i < lines.length) {
        const rowLine = (lines[i] ?? '').trim();
        if (!rowLine || !rowLine.includes('|') || isHeadingLine(rowLine)) break;
        const cells = splitTableCells(rowLine);
        const normalizedRow: BrsInlineSpan[][] = [];
        for (let col = 0; col < headers.length; col++) {
          normalizedRow.push(tokenizeBrsInline(cells[col] ?? ''));
        }
        rows.push(normalizedRow);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 3. Bullet List
    if (isBulletLine(line)) {
      const items: BrsInlineSpan[][] = [];
      while (i < lines.length && isBulletLine((lines[i] ?? '').trim())) {
        const content = (lines[i] ?? '').trim().replace(/^[-*•]\s+/, '').trim();
        items.push(tokenizeBrsInline(content));
        i++;
      }
      blocks.push({ type: 'bullet_list', items });
      continue;
    }

    // 4. Ordered List
    if (isOrderedLine(line)) {
      const items: Array<{ order: number; spans: BrsInlineSpan[] }> = [];
      while (i < lines.length && isOrderedLine((lines[i] ?? '').trim())) {
        const m = /^(\d+)[.)]\s+(.+)$/.exec((lines[i] ?? '').trim());
        if (m) {
          items.push({
            order: Number(m[1]),
            spans: tokenizeBrsInline(m[2]!.trim()),
          });
        }
        i++;
      }
      blocks.push({ type: 'ordered_list', items });
      continue;
    }

    // 5. Blockquote
    if (isBlockquoteLine(line)) {
      const paragraphs: BrsInlineSpan[][] = [];
      const buf: string[] = [];
      while (i < lines.length && isBlockquoteLine((lines[i] ?? '').trim())) {
        const quoteText = (lines[i] ?? '').trim().replace(/^>\s?/, '').trim();
        if (!quoteText) {
          if (buf.length > 0) {
            paragraphs.push(tokenizeBrsInline(buf.join(' ')));
            buf.length = 0;
          }
        } else {
          buf.push(quoteText);
        }
        i++;
      }
      if (buf.length > 0) {
        paragraphs.push(tokenizeBrsInline(buf.join(' ')));
      }
      blocks.push({ type: 'blockquote', paragraphs });
      continue;
    }

    // 6. Paragraph (consume consecutive plain lines)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextTrim = (lines[i] ?? '').trim();
      if (
        !nextTrim ||
        isHeadingLine(nextTrim) ||
        isBulletLine(nextTrim) ||
        isOrderedLine(nextTrim) ||
        isBlockquoteLine(nextTrim) ||
        (nextTrim.includes('|') && i + 1 < lines.length && isTableDividerLine(lines[i + 1] ?? ''))
      ) {
        break;
      }
      paraLines.push(nextTrim);
      i++;
    }
    blocks.push({
      type: 'paragraph',
      spans: tokenizeBrsInline(paraLines.join(' ')),
    });
  }

  return blocks;
}

export function escapeHtmlForBrs(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineSpansToHtml(spans: BrsInlineSpan[]): string {
  return spans
    .map((span) => {
      if (span.type === 'bold') return `<strong>${escapeHtmlForBrs(span.text)}</strong>`;
      if (span.type === 'italic') return `<em>${escapeHtmlForBrs(span.text)}</em>`;
      if (span.type === 'code') return `<code>${escapeHtmlForBrs(span.text)}</code>`;
      if (span.type === 'link' && span.href) {
        return `<a href="${escapeHtmlForBrs(span.href)}" target="_blank" rel="noopener noreferrer">${escapeHtmlForBrs(span.text)}</a>`;
      }
      if (span.type === 'cite' && span.citeNum) {
        return `<sup data-cite="${span.citeNum}">[${span.citeNum}]</sup>`;
      }
      return escapeHtmlForBrs(span.text);
    })
    .join('');
}

export function renderSafeBrsHtml(markdown: string): string {
  const blocks = parseBrsMarkdown(markdown);
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3';
          return `<${tag}>${renderInlineSpansToHtml(block.spans)}</${tag}>`;
        }
        case 'paragraph':
          return `<p>${renderInlineSpansToHtml(block.spans)}</p>`;
        case 'bullet_list':
          return `<ul>${block.items.map((item) => `<li>${renderInlineSpansToHtml(item)}</li>`).join('')}</ul>`;
        case 'ordered_list':
          return `<ol>${block.items.map((item) => `<li>${renderInlineSpansToHtml(item.spans)}</li>`).join('')}</ol>`;
        case 'blockquote':
          return `<blockquote>${block.paragraphs.map((p) => `<p>${renderInlineSpansToHtml(p)}</p>`).join('')}</blockquote>`;
        case 'table': {
          const head = `<thead><tr>${block.headers.map((h) => `<th scope="col">${renderInlineSpansToHtml(h)}</th>`).join('')}</tr></thead>`;
          const body = `<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineSpansToHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
          return `<table>${head}${body}</table>`;
        }
      }
    })
    .join('\n');
}

