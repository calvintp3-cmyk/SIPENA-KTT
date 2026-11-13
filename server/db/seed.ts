// server/db/seed.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
  UserRoleEnum,
} from '../../shared/enums/pdrb';
import { OAUTH_ONLY_PASSWORD_MARKER } from '../utils/password';
import { db, pool } from './index';
import { nationalKeywords, users } from './schema';

interface InitialKeywordSeed {
  keyword: string;
  defaultKbliCategory: KbliCategoryEnum;
  defaultExpenditureComponent: ExpenditureComponentEnum;
  description: string;
}

const INITIAL_KEYWORDS: InitialKeywordSeed[] = [
  {
    keyword: 'harga batubara acuan',
    defaultKbliCategory: KbliCategoryEnum.B,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau penetapan Harga Batubara Acuan (HBA) dan dinamika pasar ekspor tambang berdampak pada sektor B dan Ekspor Bersih KTT.',
  },
  {
    keyword: 'harga TBS kelapa sawit',
    defaultKbliCategory: KbliCategoryEnum.A,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau pergerakan harga Tandan Buah Segar (TBS) & CPO di Kaltara yang menentukan pendapatan pekebun serta pengiriman antar daerah.',
  },
  {
    keyword: 'DBH migas kaltara',
    defaultKbliCategory: KbliCategoryEnum.P,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_P,
    description:
      'Memantau alokasi Dana Bagi Hasil (DBH) migas & sumber daya alam Kalimantan Utara yang memengaruhi kapasitas belanja Pemkab Tana Tidung (KBLI 2025: P).',
  },
  {
    keyword: 'subsidi ongkos angkut',
    defaultKbliCategory: KbliCategoryEnum.H,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_P,
    description:
      'Memantau program Subsidi Ongkos Angkut (SOA) barang/penumpang pedalaman dan dampaknya pada biaya distribusi serta inflasi bahan pokok.',
  },
  {
    keyword: 'moratorium kayu',
    defaultKbliCategory: KbliCategoryEnum.A,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau regulasi pembatasan/moratorium hasil hutan kayu yang berdampak langsung ke subsektor kehutanan (KBLI A), industri kayu (C), dan ekspor.',
  },
  {
    keyword: 'harga TBS kaltara',
    defaultKbliCategory: KbliCategoryEnum.A,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau penetapan harga TBS kelapa sawit oleh Disbun Kaltara yang ditransmisikan langsung ke pekebun sawit Tana Tidung.',
  },
  {
    keyword: 'ekspor batubara kalimantan utara',
    defaultKbliCategory: KbliCategoryEnum.B,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau volume, kuota RKAB, dan pengapalan batubara dari perairan Kaltara/Tarakan ke pasar ekspor internasional.',
  },
  {
    keyword: 'DBH sawit kaltara',
    defaultKbliCategory: KbliCategoryEnum.P,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_P,
    description:
      'Memantau alokasi Dana Bagi Hasil (DBH) perkebunan sawit untuk infrastruktur jalan produksi di Kabupaten Tana Tidung.',
  },
  {
    keyword: 'subsidi ongkos angkut kaltara',
    defaultKbliCategory: KbliCategoryEnum.H,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_P,
    description:
      'Memantau penerbangan perintis dan angkutan sungai bersubsidi SOA untuk kestabilan harga sembako di KTT.',
  },
  {
    keyword: 'logistik pelabuhan kaltara tarakan',
    defaultKbliCategory: KbliCategoryEnum.H,
    defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    description:
      'Memantau arus logistik, peti kemas Malundung Tarakan, dan pelabuhan feeder ke Sesayap KTT.',
  },
  {
    keyword: 'inflasi kalimantan utara',
    defaultKbliCategory: KbliCategoryEnum.G,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_RT,
    description:
      'Memantau rilis IHK/inflasi BPS Kaltara dan komoditas pemicu volatile food yang berdampak pada konsumsi rumah tangga KTT.',
  },
];

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function runSeed() {
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();

  if (!superAdminEmail || !BASIC_EMAIL_REGEX.test(superAdminEmail)) {
    throw new Error(
      '[Seed] SUPERADMIN_EMAIL wajib diisi di .env dengan alamat Gmail / email Super Admin yang valid.',
    );
  }

  const defaultDisplayName =
    superAdminEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Super Admin SIPENA KTT';
  const superAdminName =
    (process.env.SUPERADMIN_NAME || '').trim() || `Super Admin (${defaultDisplayName})`;

  console.log('[Seed] Memulai pengisian data awal OAuth-First SIPENA KTT...');

  // 1. Seed Super Admin (Google OAuth Only — tanpa password lokal) secara idempoten
  const [existingAdmin] = await db
    .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(sql`lower(${users.email}) = ${superAdminEmail}`)
    .limit(1);

  let adminId: string;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`[Seed] Super Admin sudah terdaftar (${existingAdmin.email}), dilewati.`);
  } else {
    const [insertedAdmin] = await db
      .insert(users)
      .values({
        email: superAdminEmail,
        name: superAdminName,
        passwordHash: OAUTH_ONLY_PASSWORD_MARKER,
        role: UserRoleEnum.ADMIN,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: users.id, email: users.email });

    if (!insertedAdmin) {
      throw new Error('[Seed] Gagal menyisipkan atau mengambil akun Super Admin.');
    }

    adminId = insertedAdmin.id;
    console.log(
      `[Seed] Super Admin (Google OAuth) ditambahkan ke whitelist: ${insertedAdmin.email}`,
    );
  }

  // 2. Seed 5 master keywords awal Tana Tidung secara idempoten
  let insertedKeywordCount = 0;
  for (const item of INITIAL_KEYWORDS) {
    const [insertedKeyword] = await db
      .insert(nationalKeywords)
      .values({
        keyword: item.keyword,
        defaultKbliCategory: item.defaultKbliCategory,
        defaultExpenditureComponent: item.defaultExpenditureComponent,
        description: item.description,
        isActive: true,
        createdBy: adminId,
      })
      .onConflictDoNothing()
      .returning({ id: nationalKeywords.id, keyword: nationalKeywords.keyword });

    if (insertedKeyword) {
      insertedKeywordCount += 1;
      console.log(`[Seed] + Keyword ditambahkan: "${insertedKeyword.keyword}"`);
    } else {
      console.log(`[Seed] = Keyword sudah ada, dilewati: "${item.keyword}"`);
    }
  }

  console.log(
    `[Seed] Selesai. Super Admin ID=${adminId}, Keyword baru ditambahkan=${insertedKeywordCount}/${INITIAL_KEYWORDS.length}.`,
  );
}

runSeed()
  .catch((err) => {
    console.error('[Seed Failed]', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
