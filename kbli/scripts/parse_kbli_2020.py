import fitz
import re
import json

doc = fitz.open('f:/18 - SIPENA KTT/kbli/Publikasi KBLI (2009_2015_2020_2025)/BPS0000-klasifikasi_baku_lapangan_usaha_indonesia_2020.pdf')

def parse_kbli_2020(start_page=237, end_page=837):
    items = []
    current_item = None

    for p in range(start_page, end_page):
        blocks = doc[p].get_text('blocks')
        # Sort blocks by vertical position y0, then horizontal x0
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks:
            # Skip running headers (y0 < 50) and running footers (y0 > 670)
            if b[1] < 50 or b[1] > 670:
                continue

            txt = b[4].strip()
            if not txt or 'bps.go.id' in txt:
                continue
            if txt.isdigit() and len(txt) <= 3:
                continue
            if re.match(r'^KATEGORI\s+[A-U]$', txt, re.IGNORECASE):
                continue

            lines = [l.strip() for l in txt.split('\n') if l.strip()]
            if not lines:
                continue
            first_line = lines[0]

            is_code_block = False
            code = None
            title = ''

            # Case 1: First line is exactly the code (e.g. "A", "01", "011", "0111", "01111")
            if re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})$', first_line):
                is_code_block = True
                code = first_line
                title = ' '.join(lines[1:])
            # Case 2: First line starts with code followed by space and text
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
                    # Check if this block is continuation of title (if current_item title is incomplete and text is all caps)
                    if not current_item['explanation_parts'] and txt.isupper() and not any(txt.startswith(x) for x in ['KATEGORI INI', 'GOLONGAN POKOK INI', 'GOLONGAN INI', 'SUBGOLONGAN INI', 'KELOMPOK INI', 'MENCAKUP']):
                        current_item['title'] = (current_item['title'] + ' ' + txt).strip()
                    else:
                        current_item['explanation_parts'].append(txt)

    if current_item:
        items.append(current_item)

    # Post-process items: assign type and parent_code
    processed = []
    current_category = None
    seen_codes = set()

    for it in items:
        code = it['code']
        # Deduplicate if duplicate category or code
        if code in seen_codes and len(code) == 1:
            continue
        seen_codes.add(code)

        title = re.sub(r'\s+', ' ', it['title']).strip()
        explanation = re.sub(r'\s+', ' ', ' '.join(it['explanation_parts'])).strip()

        if len(code) == 1:
            item_type = 'kategori'
            parent_code = None
            current_category = code
        elif len(code) == 2:
            item_type = 'golongan_pokok'
            parent_code = current_category
        elif len(code) == 3:
            item_type = 'golongan'
            parent_code = code[:2]
        elif len(code) == 4:
            item_type = 'subgolongan'
            parent_code = code[:3]
        elif len(code) == 5:
            item_type = 'kelompok'
            parent_code = code[:4]
        else:
            continue

        processed.append({
            'code': code,
            'type': item_type,
            'description': title,
            'explanation': explanation,
            'parent_code': parent_code
        })

    return processed

if __name__ == '__main__':
    items = parse_kbli_2020(237, 837)
    from collections import Counter
    print(f"Total 2020 items: {len(items)}")
    print("Types:", Counter(x['type'] for x in items))
    cats = [x for x in items if x['type'] == 'kategori']
    print(f"Categories ({len(cats)}): {[x['code'] for x in cats]}")
