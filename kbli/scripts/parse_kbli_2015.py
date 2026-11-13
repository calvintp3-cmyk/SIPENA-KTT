import fitz
import re

doc = fitz.open('f:/18 - SIPENA KTT/kbli/Publikasi KBLI (2009_2015_2020_2025)/BPS0000-klasifikasi_baku_lapangan_usaha_indonesia_2015.pdf')

def parse_kbli_2015(start_page=102, end_page=106):
    items = []
    current_item = None

    for p in range(start_page, end_page):
        blocks = doc[p].get_text('blocks')
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks:
            txt = b[4].strip()
            if not txt or 'bps.go.id' in txt:
                continue
            if 'KATEGORI/' in txt or 'JUDUL - DESKRIPSI' in txt or 'Klasifikasi Baku Lapangan' in txt:
                continue
            if re.match(r'^Kategori:\s+[A-U]$', txt, re.IGNORECASE):
                continue
            if txt.isdigit() and len(txt) <= 3:
                continue

            lines = [l.strip() for l in txt.split('\n') if l.strip()]
            if not lines:
                continue

            # In 2015: last line is usually the code!
            # e.g. "PERTANIAN JAGUNG\n01111" -> code="01111", title="PERTANIAN JAGUNG"
            # Or "01111\nPERTANIAN JAGUNG"
            # Or single line code: "01111"
            last_line = lines[-1]
            first_line = lines[0]

            is_code_block = False
            code = None
            title = ''

            # Check if last line is a code
            if re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})$', last_line) and len(lines) > 1:
                is_code_block = True
                code = last_line
                title = ' '.join(lines[:-1])
            # Check if first line is a code
            elif re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})$', first_line):
                is_code_block = True
                code = first_line
                title = ' '.join(lines[1:])
            elif re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})\s+[A-Z]', first_line):
                m = re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})\s+(.*)$', first_line)
                is_code_block = True
                code = m.group(1)
                title = m.group(2) + (' ' + ' '.join(lines[1:]) if len(lines) > 1 else '')

            if is_code_block and code:
                if current_item:
                    items.append(current_item)
                current_item = {
                    'code': code,
                    'title': title.strip(),
                    'explanation_parts': []
                }
            else:
                if current_item:
                    current_item['explanation_parts'].append(txt)

    if current_item:
        items.append(current_item)

    return items

if __name__ == '__main__':
    items = parse_kbli_2015(102, 106)
    print(f"Extracted {len(items)} items from 2015 pages 102-105:")
    for it in items[:15]:
        expl = ' '.join(it['explanation_parts'])[:60].replace('\n', ' ')
        print(f"[{it['code']}] {it['title']} -> {expl}...")
