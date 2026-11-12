CREATE TYPE "public"."kbli_category_v2025" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V');--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_verified_completeness_chk";--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "kbli_category" TYPE "public"."kbli_category_v2025" USING (CASE "kbli_category"::text WHEN 'U' THEN 'V' WHEN 'T' THEN 'U' WHEN 'S' THEN 'T' WHEN 'R' THEN 'S' WHEN 'Q' THEN 'R' WHEN 'P' THEN 'Q' WHEN 'O' THEN 'P' WHEN 'N' THEN 'O' WHEN 'M' THEN 'N' WHEN 'L' THEN 'M' WHEN 'K' THEN 'L' ELSE "kbli_category"::text END)::"public"."kbli_category_v2025";--> statement-breakpoint
ALTER TABLE "national_keywords" ALTER COLUMN "default_kbli_category" TYPE "public"."kbli_category_v2025" USING (CASE "default_kbli_category"::text WHEN 'U' THEN 'V' WHEN 'T' THEN 'U' WHEN 'S' THEN 'T' WHEN 'R' THEN 'S' WHEN 'Q' THEN 'R' WHEN 'P' THEN 'Q' WHEN 'O' THEN 'P' WHEN 'N' THEN 'O' WHEN 'M' THEN 'N' WHEN 'L' THEN 'M' WHEN 'K' THEN 'L' ELSE "default_kbli_category"::text END)::"public"."kbli_category_v2025";--> statement-breakpoint
UPDATE "synthesis_drafts" SET "target_code" = CASE "target_code" WHEN 'J' THEN 'J,K' WHEN 'K' THEN 'L' WHEN 'L' THEN 'M' WHEN 'M,N' THEN 'N,O' WHEN 'M' THEN 'N' WHEN 'N' THEN 'O' WHEN 'O' THEN 'P' WHEN 'P' THEN 'Q' WHEN 'Q' THEN 'R' WHEN 'R,S,T,U' THEN 'S,T,U,V' WHEN 'R' THEN 'S' WHEN 'S' THEN 'T' WHEN 'T' THEN 'U' WHEN 'U' THEN 'V' ELSE "target_code" END WHERE "dimension" = 'kbli' AND "target_code" IN ('J','K','L','M','N','M,N','O','P','Q','R','S','T','U','R,S,T,U');--> statement-breakpoint
DROP TYPE "public"."kbli_category";--> statement-breakpoint
ALTER TYPE "public"."kbli_category_v2025" RENAME TO "kbli_category";--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_verified_completeness_chk" CHECK ("articles"."verification_status" <> 'VERIFIED' OR (
        "articles"."is_economic_phenomenon" = true AND
        "articles"."summary" IS NOT NULL AND
        "articles"."kbli_category" IS NOT NULL AND
        "articles"."kbli_impact" IS NOT NULL AND
        "articles"."expenditure_component" IS NOT NULL AND
        "articles"."expenditure_impact" IS NOT NULL
      ));--> statement-breakpoint
ALTER TABLE "synthesis_drafts" DROP CONSTRAINT "synthesis_drafts_mode_chk";--> statement-breakpoint
ALTER TABLE "scraper_logs" ADD COLUMN "provider_stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "synthesis_drafts" ADD CONSTRAINT "synthesis_drafts_mode_chk" CHECK ("synthesis_drafts"."generation_mode" IN ('gemini', 'llm', 'template'));
