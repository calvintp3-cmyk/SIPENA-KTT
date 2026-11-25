// server/db/curate-ump-articles.ts
import 'dotenv/config';
import { db, pool } from './index';
import { articles } from './schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { VerificationStatusEnum } from '../../shared/enums/pdrb';

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');

  console.log(`============================================================`);
  console.log(`KURASI FENOMENA UMP KALTARA 2027`);
  console.log(`Mode: ${applyMode ? 'APPLY (Update DB)' : 'DRY-RUN (Pratinjau)'}`);
  console.log(`============================================================\n`);

  // Daftar artikel yang akan di-IGNORE karena merupakan rilis pers umum (copy-paste fakta yang sama)
  // yang sudah diwakili oleh artikel acuan utama (Kaltim Post):
  const toIgnoreDuplicates = [
    {
      id: '9a32187a-b7c5-4c59-8d41-d3fe6db78548',
      portal: 'detik.com',
      title: 'Naik 6,7 Persen, UMP Kalimantan Utara 2027 Ditetapkan Rp 4,02 Juta',
      reason: 'Duplikasi rilis umum penetapan UMP Kaltara 2027 (sudah diwakili artikel acuan utama Kaltim Post).',
    },
    {
      id: '743b0506-69d6-44ca-b605-6f6eb80ee3ea',
      portal: 'cnbcindonesia.com',
      title: 'UMP Kalimantan Utara 2027 Diketok Rp 4.027.901, Naik Rp 252.658',
      reason: 'Duplikasi rilis umum penetapan UMP Kaltara 2027 (sudah diwakili artikel acuan utama Kaltim Post).',
    },
    {
      id: '61b84ca8-9572-46be-a4b7-d958564a2aee',
      portal: 'databoks.katadata.co.id',
      title: 'UMP Kalimantan Utara 2027 Ditetapkan Rp4,02 Juta, Naik 7,26% | Katadata',
      reason: 'Duplikasi rilis umum penetapan UMP Kaltara 2027 (sudah diwakili artikel acuan utama Kaltim Post).',
    },
    {
      id: 'e62b3e87-9bb3-4530-9b36-7e449f872c0c',
      portal: 'beraupost.jawapos.com',
      title: 'Naik 6,69 Persen dari Tahun Sebelumnya, UMP Kalimantan Utara 2027 Ditetapkan Rp 4,02 Juta',
      reason: 'Duplikasi rilis umum penetapan UMP Kaltara 2027 (sudah diwakili artikel acuan utama Kaltim Post).',
    },
    {
      id: 'e8c4c1be-1b29-4d69-b5f7-64ca78cf95a5',
      portal: 'spkep-spsi.org',
      title: 'UMP Kalimantan Utara 2027 Ditetapkan Rp4,02 Juta, Serikat Pekerja Buka Suara',
      reason: 'Duplikasi rilis umum penetapan UMP Kaltara 2027 (sudah diwakili artikel acuan utama Kaltim Post).',
    },
    // Bersihkan juga duplikat 100% dari portal Tribunnews (Tol Laut Dishub)
    {
      id: '83d7975d-be91-4538-9722-1742a1e7d620',
      portal: 'kaltara.tribunnews.com',
      title: 'Sambung Rantai Distribusi Tol Laut dari Tarakan, Dishub Kaltara Andalkan Feri dan Kapal Pengumpan',
      reason: 'Duplikasi persis 100% artikel Tol Laut Dishub Kaltara (sudah diwakili artikel ID 79a961d9).',
    },
  ];

  // Daftar artikel yang DIPERTAHANKAN sebagai VERIFIED karena memiliki sudut pandang NICHE yang unik:
  const keptArticles = [
    {
      id: 'e0bb5849-413e-4e2b-ad00-b7f43222c860',
      portal: 'kaltimpost.jawapos.com',
      title: 'UMP Kaltara 2027 Resmi Naik Jadi Rp 4.027.901, Berikut Perbandingan dengan Upah Tahun 2026',
      role: 'SUMBER ACUAN RESMI UTAMA: Angka resmi Rp 4.027.901 (+6,69%), pertumbuhan ekonomi 5,51%, inflasi 2,56%',
    },
    {
      id: 'c09cc6fb-530f-4cb6-a140-b30667e3773e',
      portal: 'haisawit.co.id',
      title: 'Upah Minimum Sawit Kaltara 2027 Capai Rp4,05 Juta per Bulan',
      role: 'NICHE SEKTORAL: Upah Minimum Sektoral Provinsi (UMSP) Perkebunan Kelapa Sawit (Rp 4.053.065 / Kepgub No. 100.3.3.1/547/2026)',
    },
    {
      id: 'da64c6bb-4e4d-4058-9e36-14cee4b2bd7e',
      portal: 'rri.co.id',
      title: 'Di Balik Kenaikan UMP 2027, Pekerja Masih Dibayangi Persoalan Daya Beli',
      role: 'NICHE ANALITIS KESEJAHTERAAN: Analisis akademisi terhadap inflasi akumulatif 11% dan transmisi daya beli riil',
    },
    {
      id: 'd475010f-6fce-437b-9c96-8c89ae3ec389',
      portal: 'feedberry.com',
      title: 'UMP Kaltara 2027 Naik 6,69% — Masih 77,48% dari KHL',
      role: 'NICHE INDIKATOR KHL: Perbandingan upah dengan persentase Kebutuhan Hidup Layak (77,48% KHL)',
    },
    {
      id: '3cb85ec3-639a-4c27-a068-d69eb07fc367',
      portal: 'korankaltara.com',
      title: 'UMP Kaltara 2027 Dituntut Naik Jadi Rp 5,19 Juta',
      role: 'NICHE HISTORIS/ASPIRASI: Tuntutan serikat pekerja pra-penetapan sebelum putusan final',
    },
  ];

  console.log(`[1] ARTIKEL DENGAN SUDUT PANDANG NICHE / ACUAN UTAMA (DIPERTAHANKAN SEBAGAI VERIFIED):`);
  for (const k of keptArticles) {
    console.log(`  ✓ [${k.portal}] ${k.title}`);
    console.log(`    Peran: ${k.role}\n`);
  }

  console.log(`[2] ARTIKEL DUPLIKAT RILIS UMUM / NON-NICHE (DIUBAH KE STATUS 'IGNORED'):`);
  for (const d of toIgnoreDuplicates) {
    console.log(`  ✗ [${d.portal}] ${d.title}`);
    console.log(`    Alasan: ${d.reason}\n`);
  }

  if (!applyMode) {
    console.log(`Mode DRY-RUN selesai. Jalankan dengan flag --apply untuk memperbarui database.`);
    return;
  }

  for (const item of toIgnoreDuplicates) {
    await db
      .update(articles)
      .set({
        verificationStatus: VerificationStatusEnum.IGNORED,
        isEconomicPhenomenon: false,
        curatorNotes: item.reason,
        llmError: item.reason,
      })
      .where(eq(articles.id, item.id));
  }

  console.log(`SUKSES: ${toIgnoreDuplicates.length} artikel redundan berhasil dipindahkan ke status IGNORED.`);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
