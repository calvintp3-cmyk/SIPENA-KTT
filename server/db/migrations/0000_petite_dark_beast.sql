CREATE TYPE "public"."article_source_type" AS ENUM('REGIONAL', 'NATIONAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."expenditure_component" AS ENUM('PK_RT', 'PK_LNPRT', 'PK_P', 'PMTB', 'INVENTORY_CHANGE', 'NET_EXPORT');--> statement-breakpoint
CREATE TYPE "public"."expenditure_impact" AS ENUM('INCREASE_REAL', 'DECREASE_REAL', 'INCREASE_DEFLATOR', 'DECREASE_DEFLATOR');--> statement-breakpoint
CREATE TYPE "public"."kbli_category" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U');--> statement-breakpoint
CREATE TYPE "public"."kbli_impact" AS ENUM('INCREASE_NTB', 'DECREASE_NTB', 'INCREASE_PRICE', 'DECREASE_PRICE');--> statement-breakpoint
CREATE TYPE "public"."llm_status" AS ENUM('SUCCESS', 'FAILED', 'SKIPPED_MANUAL');--> statement-breakpoint
CREATE TYPE "public"."scraper_run_status" AS ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."scraper_run_type" AS ENUM('SCHEDULED', 'MANUAL', 'RETRY_LLM');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'OPERATOR');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'VERIFIED', 'IGNORED');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"url_hash" text NOT NULL,
	"source_type" "article_source_type" NOT NULL,
	"source_portal" text NOT NULL,
	"title" text NOT NULL,
	"snippet_text" text NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"quarter" smallint NOT NULL,
	"year" smallint NOT NULL,
	"is_economic_phenomenon" boolean,
	"summary" text,
	"kbli_category" "kbli_category",
	"kbli_impact" "kbli_impact",
	"expenditure_component" "expenditure_component",
	"expenditure_impact" "expenditure_impact",
	"llm_model" text,
	"llm_status" "llm_status" DEFAULT 'SUCCESS' NOT NULL,
	"llm_error" text,
	"llm_confidence" double precision,
	"verification_status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"keyword_id" uuid,
	"scraper_log_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_quarter_range_chk" CHECK ("articles"."quarter" BETWEEN 1 AND 4),
	CONSTRAINT "articles_year_range_chk" CHECK ("articles"."year" BETWEEN 2000 AND 2100),
	CONSTRAINT "articles_word_count_chk" CHECK ("articles"."word_count" >= 0),
	CONSTRAINT "articles_verified_completeness_chk" CHECK ("articles"."verification_status" <> 'VERIFIED' OR (
        "articles"."is_economic_phenomenon" = true AND
        "articles"."summary" IS NOT NULL AND
        "articles"."kbli_category" IS NOT NULL AND
        "articles"."kbli_impact" IS NOT NULL AND
        "articles"."expenditure_component" IS NOT NULL AND
        "articles"."expenditure_impact" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "national_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" text NOT NULL,
	"default_kbli_category" "kbli_category",
	"default_expenditure_component" "expenditure_component",
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_type" "scraper_run_type" NOT NULL,
	"status" "scraper_run_status" DEFAULT 'RUNNING' NOT NULL,
	"portals_checked" integer DEFAULT 0 NOT NULL,
	"keywords_checked" integer DEFAULT 0 NOT NULL,
	"articles_fetched" integer DEFAULT 0 NOT NULL,
	"articles_deduplicated" integer DEFAULT 0 NOT NULL,
	"articles_inserted" integer DEFAULT 0 NOT NULL,
	"economic_count" integer DEFAULT 0 NOT NULL,
	"non_economic_count" integer DEFAULT 0 NOT NULL,
	"llm_failed_count" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"avg_response_time_ms" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"error_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggered_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "scraper_logs_counters_nonneg_chk" CHECK (
      "scraper_logs"."portals_checked" >= 0 AND
      "scraper_logs"."keywords_checked" >= 0 AND
      "scraper_logs"."articles_fetched" >= 0 AND
      "scraper_logs"."articles_deduplicated" >= 0 AND
      "scraper_logs"."articles_inserted" >= 0 AND
      "scraper_logs"."total_tokens" >= 0
    )
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'OPERATOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_keyword_id_national_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."national_keywords"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_scraper_log_id_scraper_logs_id_fk" FOREIGN KEY ("scraper_log_id") REFERENCES "public"."scraper_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "national_keywords" ADD CONSTRAINT "national_keywords_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraper_logs" ADD CONSTRAINT "scraper_logs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_url_hash_uidx" ON "articles" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "articles_public_period_idx" ON "articles" USING btree ("verification_status","is_economic_phenomenon","year","quarter","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_review_queue_idx" ON "articles" USING btree ("verification_status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_kbli_period_idx" ON "articles" USING btree ("kbli_category","year","quarter");--> statement-breakpoint
CREATE INDEX "articles_exp_period_idx" ON "articles" USING btree ("expenditure_component","year","quarter");--> statement-breakpoint
CREATE INDEX "articles_source_portal_idx" ON "articles" USING btree ("source_portal","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_keyword_id_idx" ON "articles" USING btree ("keyword_id");--> statement-breakpoint
CREATE INDEX "articles_scraper_log_id_idx" ON "articles" USING btree ("scraper_log_id");--> statement-breakpoint
CREATE INDEX "articles_verified_by_idx" ON "articles" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX "articles_created_by_idx" ON "articles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "articles_llm_retry_partial_idx" ON "articles" USING btree ("created_at") WHERE "articles"."llm_status" = 'FAILED';--> statement-breakpoint
CREATE UNIQUE INDEX "national_keywords_keyword_uidx" ON "national_keywords" USING btree (lower("keyword"));--> statement-breakpoint
CREATE INDEX "national_keywords_active_idx" ON "national_keywords" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "national_keywords_created_by_idx" ON "national_keywords" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "scraper_logs_started_at_idx" ON "scraper_logs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scraper_logs_status_idx" ON "scraper_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scraper_logs_triggered_by_idx" ON "scraper_logs" USING btree ("triggered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");