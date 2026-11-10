CREATE TYPE "public"."expenditure_component_enum" AS ENUM('PK_RT', 'PK_LNPRT', 'PK_P', 'PMTB', 'PI', 'EKSPOR', 'IMPOR', 'TIDAK_RELEVAN');--> statement-breakpoint
CREATE TYPE "public"."impact_type_enum" AS ENUM('positif', 'negatif', 'netral');--> statement-breakpoint
CREATE TYPE "public"."kbli_category_enum" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M_N', 'O', 'P', 'Q', 'R_S_T_U');--> statement-breakpoint
CREATE TYPE "public"."phenomenon_status_enum" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."price_volume_effect_enum" AS ENUM('volume', 'harga', 'keduanya', 'tidak_langsung');--> statement-breakpoint
CREATE TYPE "public"."quarter_enum" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');--> statement-breakpoint
CREATE TYPE "public"."source_media_enum" AS ENUM('koran_kaltara', 'radar_tarakan', 'tribun_kaltara', 'benuanta', 'antara_kaltara', 'national_media');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"source" "source_media_enum" NOT NULL,
	"published_date" timestamp with time zone NOT NULL,
	"author" varchar(255),
	"content" text NOT NULL,
	"raw_html" text,
	"is_scraped" boolean DEFAULT true NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"scrape_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phenomenon_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"previous_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_phenomena" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"is_economic_phenomenon" boolean NOT NULL,
	"summary" text NOT NULL,
	"kbli_category" "kbli_category_enum",
	"kbli_subsector" varchar(255),
	"expenditure_component" "expenditure_component_enum",
	"impact_type" "impact_type_enum",
	"price_volume_effect" "price_volume_effect_enum",
	"affected_commodities" text[],
	"key_numerical_data" jsonb,
	"quarter" "quarter_enum" NOT NULL,
	"year" smallint NOT NULL,
	"confidence_score" real,
	"status" "phenomenon_status_enum" DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role_enum" DEFAULT 'editor' NOT NULL,
	"nip" varchar(18),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_phenomenon_id_economic_phenomena_id_fk" FOREIGN KEY ("phenomenon_id") REFERENCES "public"."economic_phenomena"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_phenomena" ADD CONSTRAINT "economic_phenomena_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_phenomena" ADD CONSTRAINT "economic_phenomena_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_url_hash_idx" ON "articles" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "articles_published_date_idx" ON "articles" USING btree ("published_date");--> statement-breakpoint
CREATE INDEX "articles_source_idx" ON "articles" USING btree ("source");--> statement-breakpoint
CREATE INDEX "articles_is_processed_idx" ON "articles" USING btree ("is_processed");--> statement-breakpoint
CREATE INDEX "audit_logs_phenomenon_id_idx" ON "audit_logs" USING btree ("phenomenon_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "phenomena_article_id_idx" ON "economic_phenomena" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "phenomena_verified_by_idx" ON "economic_phenomena" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX "phenomena_status_idx" ON "economic_phenomena" USING btree ("status");--> statement-breakpoint
CREATE INDEX "phenomena_quarter_year_idx" ON "economic_phenomena" USING btree ("year","quarter");--> statement-breakpoint
CREATE INDEX "phenomena_kbli_idx" ON "economic_phenomena" USING btree ("kbli_category");--> statement-breakpoint
CREATE INDEX "phenomena_expenditure_idx" ON "economic_phenomena" USING btree ("expenditure_component");