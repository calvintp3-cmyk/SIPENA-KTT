import fitz
import re
import os
import json
import sqlite3
import pandas as pd

CATEGORY_NAMES_2020 = {
    'A': 'PERTANIAN, KEHUTANAN DAN PERIKANAN',
    'B': 'PERTAMBANGAN DAN PENGGALIAN',
    'C': 'INDUSTRI PENGOLAHAN',
    'D': 'PENGADAAN LISTRIK, GAS, UAP/AIR PANAS DAN UDARA DINGIN',
    'E': 'TREATMENT AIR, TREATMENT AIR LIMBAH, TREATMENT DAN PEMULIHAN MATERIAL SAMPAH, DAN AKTIVITAS REMEDIASI',
    'F': 'KONSTRUKSI',
    'G': 'PERDAGANGAN BESAR DAN ECERAN; REPARASI DAN PERAWATAN MOBIL DAN SEPEDA MOTOR',
    'H': 'PENGANGKUTAN DAN PERGUDANGAN',
    'I': 'PENYEDIAAN AKOMODASI DAN PENYEDIAAN MAKAN MINUM',
    'J': 'INFORMASI DAN KOMUNIKASI',
    'K': 'AKTIVITAS KEUANGAN DAN ASURANSI',
    'L': 'REAL ESTAT',
    'M': 'AKTIVITAS PROFESIONAL, ILMIAH DAN TEKNIS',
    'N': 'AKTIVITAS PENYEWAAN DAN SEWA GUNA USAHA TANPA HAK OPSI, KETENAGAKERJAAN, AGEN PERJALANAN DAN PENUNJANG USAHA LAINNYA',
    'O': 'ADMINISTRASI PEMERINTAHAN, PERTAHANAN DAN JAMINAN SOSIAL WAJIB',
    'P': 'PENDIDIKAN',
    'Q': 'AKTIVITAS KESEHATAN MANUSIA DAN AKTIVITAS SOSIAL',
    'R': 'KESENIAN, HIBURAN DAN REKREASI',
    'S': 'AKTIVITAS JASA LAINNYA',
    'T': 'AKTIVITAS RUMAH TANGGA SEBAGAI PEMBERI KERJA; AKTIVITAS YANG MENGHASILKAN BARANG DAN JASA OLEH RUMAH TANGGA YANG DIGUNAKAN SENDIRI UNTUK MEMENUHI KEBUTUHAN',
    'U': 'AKTIVITAS BADAN INTERNASIONAL DAN BADAN EKSTRA INTERNASIONAL LAINNYA'
}

CATEGORY_NAMES_2015 = {
    'A': 'PERTANIAN, KEHUTANAN DAN PERIKANAN',
    'B': 'PERTAMBANGAN DAN PENGGALIAN',
    'C': 'INDUSTRI PENGOLAHAN',
    'D': 'PENGADAAN LISTRIK, GAS, UAP/AIR PANAS DAN UDARA DINGIN',
    'E': 'PENGADAAN AIR, PENGELOLAAN SAMPAH DAN DAUR ULANG, PEMBUANGAN DAN PEMBERSIHAN LIMBAH DAN SAMPAH',
    'F': 'KONSTRUKSI',
    'G': 'PERDAGANGAN BESAR DAN ECERAN; REPARASI DAN PERAWATAN MOBIL DAN SEPEDA MOTOR',
    'H': 'TRANSPORTASI DAN PERGUDANGAN',
    'I': 'PENYEDIAAN AKOMODASI DAN PENYEDIAAN MAKAN MINUM',
    'J': 'INFORMASI DAN KOMUNIKASI',
    'K': 'AKTIVITAS KEUANGAN DAN ASURANSI',
    'L': 'REAL ESTAT',
    'M': 'AKTIVITAS PROFESIONAL, ILMIAH DAN TEKNIS',
    'N': 'AKTIVITAS PENYEWAAN DAN SEWA GUNA USAHA TANPA HAK OPSI, KETENAGAKERJAAN, AGEN PERJALANAN DAN PENUNJANG USAHA LAINNYA',
    'O': 'ADMINISTRASI PEMERINTAHAN, PERTAHANAN DAN JAMINAN SOSIAL WAJIB',
    'P': 'PENDIDIKAN',
    'Q': 'AKTIVITAS KESEHATAN MANUSIA DAN AKTIVITAS SOSIAL',
    'R': 'KESENIAN, HIBURAN DAN REKREASI',
    'S': 'AKTIVITAS JASA LAINNYA',
    'T': 'AKTIVITAS RUMAH TANGGA SEBAGAI PEMBERI KERJA; AKTIVITAS YANG MENGHASILKAN BARANG DAN JASA OLEH RUMAH TANGGA YANG DIGUNAKAN SENDIRI UNTUK MEMENUHI KEBUTUHAN',
    'U': 'AKTIVITAS BADAN INTERNASIONAL DAN BADAN EKSTRA INTERNASIONAL LAINNYA'
}

def clean_text(txt):
    if not txt:
        return ''
    return re.sub(r'\s+', ' ', txt).strip()

def extract_kbli_2020():
    pdf_path = 'f:/18 - SIPENA KTT/kbli/Publikasi KBLI (2009_2015_2020_2025)/BPS0000-klasifikasi_baku_lapangan_usaha_indonesia_2020.pdf'
    doc = fitz.open(pdf_path)
    items = []
    current_item = None
    current_category = None

    for p in range(237, 837):
        blocks = doc[p].get_text('blocks')
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks:
            x0, y0, x1, y1, text, bno, btype = b
            # Skip running headers and footers
            if y0 < 50 or y0 > 670:
                continue
            txt = text.strip()
            if not txt or 'bps.go.id' in txt:
                continue
            if txt.isdigit() and len(txt) <= 3:
                continue
            if re.match(r'^KATEGORI\s+[A-U]$', txt, re.IGNORECASE):
                continue

            lines = [clean_text(l) for l in txt.split('\n') if clean_text(l)]
            if not lines:
                continue
            first_line = lines[0]

            is_code_block = False
            code = None
            title = ''

            # Code blocks in 2020 are on the left margin (x0 <= 85)
            if x0 <= 85:
                # Case 1: First line is exact code (e.g. "A", "01", "011", "0111", "01111")
                if re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})$', first_line):
                    is_code_block = True
                    code = first_line
                    title = ' '.join(lines[1:])
                # Case 2: First line starts with code followed by space
                elif re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})\s+[A-Z]', first_line):
                    m = re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})\s+(.*)$', first_line)
                    is_code_block = True
                    code = m.group(1)
                    title = m.group(2) + (' ' + ' '.join(lines[1:]) if len(lines) > 1 else '')

            if is_code_block and code:
                if current_item:
                    items.append(current_item)
                # If category and title empty, take from master dict
                if len(code) == 1 and not title:
                    title = CATEGORY_NAMES_2020.get(code, '')
                current_item = {
                    'code': code,
                    'title': title.strip(),
                    'explanation_parts': []
                }
            else:
                if current_item:
                    # Check title continuation
                    if not current_item['explanation_parts'] and txt.isupper() and not any(txt.startswith(x) for x in ['KATEGORI INI', 'GOLONGAN POKOK INI', 'GOLONGAN INI', 'SUBGOLONGAN INI', 'KELOMPOK INI', 'MENCAKUP']):
                        current_item['title'] = (current_item['title'] + ' ' + txt).strip()
                    else:
                        current_item['explanation_parts'].append(txt)

    if current_item:
        items.append(current_item)

    # Format into standard records
    processed = []
    seen = set()
    for it in items:
        code = it['code']
        if code in seen and len(code) == 1:
            continue
        seen.add(code)

        title = clean_text(it['title'])
        if len(code) == 1 and (not title or title == code):
            title = CATEGORY_NAMES_2020.get(code, title)

        explanation = clean_text(' '.join(it['explanation_parts']))

        if len(code) == 1:
            itype = 'kategori'
            parent = None
            current_category = code
        elif len(code) == 2:
            itype = 'golongan_pokok'
            parent = current_category
        elif len(code) == 3:
            itype = 'golongan'
            parent = code[:2]
        elif len(code) == 4:
            itype = 'subgolongan'
            parent = code[:3]
        elif len(code) == 5:
            itype = 'kelompok'
            parent = code[:4]
        else:
            continue

        processed.append({
            'code': code,
            'type': itype,
            'description': title,
            'explanation': explanation,
            'parent_code': parent
        })

    return processed

def extract_kbli_2015():
    pdf_path = 'f:/18 - SIPENA KTT/kbli/Publikasi KBLI (2009_2015_2020_2025)/BPS0000-klasifikasi_baku_lapangan_usaha_indonesia_2015.pdf'
    doc = fitz.open(pdf_path)
    items = []
    current_item = None
    current_category = None

    for p in range(102, 563):
        blocks = doc[p].get_text('blocks')
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks:
            x0, y0, x1, y1, text, bno, btype = b
            if y0 < 55 or y0 > 635:
                continue
            txt = text.strip()
            if not txt or 'bps.go.id' in txt:
                continue
            if 'KATEGORI/' in txt or 'JUDUL - DESKRIPSI' in txt or 'Klasifikasi Baku Lapangan' in txt:
                continue
            if re.match(r'^Kategori:\s+[A-U]$', txt, re.IGNORECASE):
                continue
            if txt.isdigit() and len(txt) <= 3:
                continue

            lines = [clean_text(l) for l in txt.split('\n') if clean_text(l)]
            if not lines:
                continue

            is_code_block = False
            code = None
            title = ''

            # In 2015: code blocks have x0 < 100
            if x0 < 100:
                last_line = lines[-1]
                first_line = lines[0]
                if re.match(r'^([A-U]|\d{2}|\d{3}|\d{4}|\d{5})$', last_line) and len(lines) > 1:
                    is_code_block = True
                    code = last_line
                    title = ' '.join(lines[:-1])
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
                if len(code) == 1 and not title:
                    title = CATEGORY_NAMES_2015.get(code, '')
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

    processed = []
    seen = set()
    for it in items:
        code = it['code']
        if code in seen and len(code) == 1:
            continue
        seen.add(code)

        title = clean_text(it['title'])
        if len(code) == 1 and (not title or title == code):
            title = CATEGORY_NAMES_2015.get(code, title)

        explanation = clean_text(' '.join(it['explanation_parts']))

        if len(code) == 1:
            itype = 'kategori'
            parent = None
            current_category = code
        elif len(code) == 2:
            itype = 'golongan_pokok'
            parent = current_category
        elif len(code) == 3:
            itype = 'golongan'
            parent = code[:2]
        elif len(code) == 4:
            itype = 'subgolongan'
            parent = code[:3]
        elif len(code) == 5:
            itype = 'kelompok'
            parent = code[:4]
        else:
            continue

        processed.append({
            'code': code,
            'type': itype,
            'description': title,
            'explanation': explanation,
            'parent_code': parent
        })

    return processed

def build_tree(records):
    by_code = {r['code']: dict(r, children=[]) for r in records}
    tree = []
    for r in records:
        node = by_code[r['code']]
        parent = r['parent_code']
        if parent and parent in by_code:
            by_code[parent]['children'].append(node)
        elif r['type'] == 'kategori':
            tree.append(node)
    return tree

def build_wide(records):
    by_code = {r['code']: r for r in records}
    rows = []
    for r in records:
        if r['type'] != 'kelompok':
            continue
        code5 = r['code']
        code4 = r['parent_code']
        code3 = by_code.get(code4, {}).get('parent_code')
        code2 = by_code.get(code3, {}).get('parent_code')
        code1 = by_code.get(code2, {}).get('parent_code')

        subgol = by_code.get(code4, {})
        gol = by_code.get(code3, {})
        pokok = by_code.get(code2, {})
        kat = by_code.get(code1, {})

        rows.append({
            'kategori_code': kat.get('code', ''),
            'kategori_name': kat.get('description', ''),
            'kategori_explanation': kat.get('explanation', ''),
            'golongan_pokok_code': pokok.get('code', ''),
            'golongan_pokok_name': pokok.get('description', ''),
            'golongan_pokok_explanation': pokok.get('explanation', ''),
            'golongan_code': gol.get('code', ''),
            'golongan_name': gol.get('description', ''),
            'golongan_explanation': gol.get('explanation', ''),
            'subgolongan_code': subgol.get('code', ''),
            'subgolongan_name': subgol.get('description', ''),
            'subgolongan_explanation': subgol.get('explanation', ''),
            'kelompok_code': r['code'],
            'kelompok_name': r['description'],
            'kelompok_explanation': r['explanation']
        })
    return pd.DataFrame(rows)

def save_bundle(year, records):
    out_dir = f'f:/18 - SIPENA KTT/kbli/kbli{year}_parsing'
    os.makedirs(out_dir, exist_ok=True)
    prefix = f'kbli{year}'

    print(f"\n[{year}] Generating datasets into {out_dir}...")

    # 1. JSON
    json_path = os.path.join(out_dir, f'{prefix}.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved {json_path} ({len(records)} records)")

    # 2. CSV
    df_flat = pd.DataFrame(records)
    csv_path = os.path.join(out_dir, f'{prefix}.csv')
    df_flat.to_csv(csv_path, index=False, encoding='utf-8')
    print(f"  -> Saved {csv_path}")

    # 3. Tree JSON
    tree = build_tree(records)
    tree_path = os.path.join(out_dir, f'{prefix}_tree.json')
    with open(tree_path, 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved {tree_path} (root categories: {len(tree)})")

    # 4. Wide DataFrame
    df_wide = build_wide(records)
    wide_csv_path = os.path.join(out_dir, f'{prefix}_wide.csv')
    df_wide.to_csv(wide_csv_path, index=False, encoding='utf-8')
    print(f"  -> Saved {wide_csv_path} ({len(df_wide)} rows)")

    # 5. SQLite DBs
    db_path = os.path.join(out_dir, f'{prefix}.db')
    conn = sqlite3.connect(db_path)
    df_flat.to_sql(prefix, conn, if_exists='replace', index=False)
    conn.close()
    print(f"  -> Saved {db_path}")

    wide_db_path = os.path.join(out_dir, f'{prefix}_wide.db')
    conn_w = sqlite3.connect(wide_db_path)
    df_wide.to_sql(f'{prefix}_wide', conn_w, if_exists='replace', index=False)
    conn_w.close()
    print(f"  -> Saved {wide_db_path}")

    # 6. Excel Files
    xlsx_path = os.path.join(out_dir, f'{prefix}.xlsx')
    df_flat.to_excel(xlsx_path, index=False, sheet_name=prefix)
    print(f"  -> Saved {xlsx_path}")

    wide_xlsx_path = os.path.join(out_dir, f'{prefix}_wide.xlsx')
    df_wide.to_excel(wide_xlsx_path, index=False, sheet_name=f'{prefix}_wide')
    print(f"  -> Saved {wide_xlsx_path}")

if __name__ == '__main__':
    print("=== EXTRACTING KBLI 2020 ===")
    records_2020 = extract_kbli_2020()
    save_bundle('2020', records_2020)

    print("\n=== EXTRACTING KBLI 2015 ===")
    records_2015 = extract_kbli_2015()
    save_bundle('2015', records_2015)

    print("\n=== ALL KBLI EXTRACTIONS COMPLETE ===")

