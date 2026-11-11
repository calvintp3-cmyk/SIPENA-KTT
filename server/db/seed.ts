// server/db/seed.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
  UserRoleEnum,
} from '../../shared/enums/pdrb';
import { hashPassword } from '../utils/password';
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
    defaultKbliCategory: KbliCategoryEnum.O,
    defaultExpenditureComponent: ExpenditureComponentEnum.PK_P,
    description:
      'Memantau alokasi Dana Bagi Hasil (DBH) migas & sumber daya alam Kalimantan Utara yang memengaruhi kapasitas belanja Pemkab Tana Tidung.',
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
];

async function runSeed() {
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@sipena-ktt.go.id')
    .trim()
    .toLowerCase();
  const adminName = (process.env.ADMIN_SEED_NAME || 'Admin Nerwilis BPS KTT').trim();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (
    !adminPassword ||
    adminPassword.length < 12 ||
    adminPassword.includes('GANTI_DENGAN_PASSWORD')
  ) {
    throw new Error(
      '[Seed] ADMIN_SEED_PASSWORD wajib disetel di .env dengan panjang minimal 12 karakter yang kuat.',
    );
  }

  console.log('[Seed] Memulai pengisian data awal SIPENA KTT...');

  // 1. Seed user default admin secara idempoten (berdasarkan lower(email))
  const [existingAdmin] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${adminEmail}`)
    .limit(1);

  let adminId: string;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`[Seed] User admin sudah terdaftar (${existingAdmin.email}), dilewati.`);
  } else {
    const passwordHash = hashPassword(adminPassword);
    const [insertedAdmin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: UserRoleEnum.ADMIN,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: users.id, email: users.email });

    if (!insertedAdmin) {
      throw new Error('[Seed] Gagal menyisipkan atau mengambil user admin.');
    }

    adminId = insertedAdmin.id;
    console.log(`[Seed] User admin baru dibuat: ${insertedAdmin.email}`);
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
    `[Seed] Selesai. Admin ID=${adminId}, Keyword baru ditambahkan=${insertedKeywordCount}/${INITIAL_KEYWORDS.length}.`,
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

