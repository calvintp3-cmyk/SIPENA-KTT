-- Migration: 0008_subdistrict_and_curator_notes
-- Menambahkan granularitas lokus kecamatan di KTT dan catatan kurator Nerwilis
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "subdistrict" text;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "curator_notes" text;
CREATE INDEX IF NOT EXISTS "articles_subdistrict_idx" ON "articles" USING btree ("subdistrict");
