import pandas as pd
import json
import os
from collections import OrderedDict

def generate_kbli_files(version):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.dirname(os.path.dirname(script_dir))
    
    csv_path = os.path.join(script_dir, f"kbli{version}_wide.csv")
    output_json = os.path.join(workspace_dir, "public", "data", f"kbli{version}.json")
    seed_path = os.path.join(script_dir, "sql", f"seed_kbli{version}.sql")

    if not os.path.exists(csv_path):
        print(f"Skipping version {version}: {csv_path} not found.")
        return

    print(f"Processing KBLI {version} from {csv_path}...")
    df = pd.read_csv(csv_path, dtype=str).fillna('')

    # Clean up spaces
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip()

    # Pad numeric codes
    df['golongan_pokok_code'] = df['golongan_pokok_code'].str.zfill(2)
    df['golongan_code'] = df['golongan_code'].str.zfill(3)
    df['subgolongan_code'] = df['subgolongan_code'].str.zfill(4)
    df['kelompok_code'] = df['kelompok_code'].str.zfill(5)

    # Build JSON Hierarchy
    categories = OrderedDict()
    for _, row in df.iterrows():
        kat_code = row['kategori_code']
        gp_code = row['golongan_pokok_code']
        g_code = row['golongan_code']
        sg_code = row['subgolongan_code']
        k_code = row['kelompok_code']

        if not kat_code:
            continue

        if kat_code not in categories:
            categories[kat_code] = {
                'kategori_kode': kat_code,
                'kategori_judul': row['kategori_name'],
                'ket_kategori': row['kategori_explanation'],
                '_gp': OrderedDict()
            }

        cat = categories[kat_code]
        if gp_code and gp_code not in cat['_gp']:
            cat['_gp'][gp_code] = {
                'golonganpokok_code': gp_code,
                'golonganpokok_judul': row['golongan_pokok_name'],
                'ket_golongan_pokok': row['golongan_pokok_explanation'],
                '_g': OrderedDict()
            }

        gp = cat['_gp'].get(gp_code)
        if gp and g_code and g_code not in gp['_g']:
            gp['_g'][g_code] = {
                'golongan_kode': g_code,
                'golongan_judul': row['golongan_name'],
                'ket_golongan': row['golongan_explanation'],
                '_sg': OrderedDict()
            }

        g = gp['_g'].get(g_code) if gp else None
        if g and sg_code and sg_code not in g['_sg']:
            g['_sg'][sg_code] = {
                'subgolongan_kode': sg_code,
                'subgolongan_judul': row['subgolongan_name'],
                'ket_subgolongan': row['subgolongan_explanation'],
                '_k': []
            }

        sg = g['_sg'].get(sg_code) if g else None
        if sg and k_code:
            sg['_k'].append({
                'kelompok_kode': k_code,
                'kelompok_judul': row['kelompok_name'],
                'ket_kelompok': row['kelompok_explanation']
            })

    # Convert to nested array structure
    result = []
    for cat in categories.values():
        cat_out = {
            'kategori_kode': cat['kategori_kode'],
            'kategori_judul': cat['kategori_judul'],
            'ket_kategori': cat['ket_kategori'],
            'golongan_pokok': []
        }
        for gp in cat['_gp'].values():
            gp_out = {
                'golonganpokok_code': gp['golonganpokok_code'],
                'golonganpokok_judul': gp['golonganpokok_judul'],
                'ket_golongan_pokok': gp['ket_golongan_pokok'],
                'golongan': []
            }
            for g in gp['_g'].values():
                g_out = {
                    'golongan_kode': g['golongan_kode'],
                    'golongan_judul': g['golongan_judul'],
                    'ket_golongan': g['ket_golongan'],
                    'subgolongan': []
                }
                for sg in g['_sg'].values():
                    sg_out = {
                        'subgolongan_kode': sg['subgolongan_kode'],
                        'subgolongan_judul': sg['subgolongan_judul'],
                        'ket_subgolongan': sg['ket_subgolongan'],
                        'kelompok': sg['_k']
                    }
                    g_out['subgolongan'].append(sg_out)
                gp_out['golongan'].append(g_out)
            cat_out['golongan_pokok'].append(gp_out)
        result.append(cat_out)

    # Write JSON file
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Generated {output_json} successfully.")

    # Write SQL Seed File (only for version 2009, or keep it generic)
    sql_lines = [
        f"-- Seed Data for kbli{version} table generated automatically from wide csv",
        "",
        f"TRUNCATE TABLE kbli{version} CASCADE;",
        ""
    ]

    columns = [
        "kode_kelompok_usaha",
        "nama_kelompok_usaha",
        "ket_kelompok_usaha",
        "kode_subgolongan",
        "nama_subgolongan",
        "ket_subgolongan",
        "kode_golongan",
        "nama_golongan",
        "ket_golongan",
        "kode_golongan_pokok",
        "nama_golongan_pokok",
        "ket_golongan_pokok",
        "kode_lapangan_usaha",
        "nama_lapangan_usaha",
        "ket_lapangan_usaha"
    ]

    def sql_val(val):
        if val == '' or pd.isna(val):
            return "NULL"
        val_str = str(val).strip()
        return f"$desc${val_str}$desc$"

    rows = []
    for _, row in df.iterrows():
        if not row['kelompok_code']:
            continue
        val_list = [
            f"'{row['kelompok_code']}'",
            sql_val(row['kelompok_name']),
            sql_val(row['kelompok_explanation']),
            f"'{row['subgolongan_code']}'" if row['subgolongan_code'] else "NULL",
            sql_val(row['subgolongan_name']),
            sql_val(row['subgolongan_explanation']),
            f"'{row['golongan_code']}'" if row['golongan_code'] else "NULL",
            sql_val(row['golongan_name']),
            sql_val(row['golongan_explanation']),
            f"'{row['golongan_pokok_code']}'" if row['golongan_pokok_code'] else "NULL",
            sql_val(row['golongan_pokok_name']),
            sql_val(row['golongan_pokok_explanation']),
            f"'{row['kategori_code']}'" if row['kategori_code'] else "NULL",
            sql_val(row['kategori_name']),
            sql_val(row['kategori_explanation'])
        ]
        rows.append(f"  ({', '.join(val_list)})")

    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        sql_lines.append(f"INSERT INTO kbli{version} (\n  {', \n  '.join(columns)}\n) VALUES")
        sql_lines.append(",\n".join(batch) + ";")
        sql_lines.append("")

    os.makedirs(os.path.dirname(seed_path), exist_ok=True)
    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))
    print(f"Generated {seed_path} successfully.")

if __name__ == '__main__':
    generate_kbli_files('2009')
    generate_kbli_files('2025')
