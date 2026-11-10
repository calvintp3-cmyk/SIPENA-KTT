CREATE TYPE "public"."odon_status_enum" AS ENUM('draft', 'pending_curation', 'verified', 'archived');--> statement-breakpoint
CREATE TYPE "public"."proposal_status_enum" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."source_media_enum" ADD VALUE 'fokus_borneo' BEFORE 'antara_kaltara';--> statement-breakpoint
CREATE TABLE "article_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"submitter_name" varchar(255) DEFAULT 'Masyarakat / OPD' NOT NULL,
	"submitter_agency" varchar(255),
	"submitter_email" varchar(255),
	"economic_notes" text,
	"status" "proposal_status_enum" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbli_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_2020" varchar(10) NOT NULL,
	"title_2020" text NOT NULL,
	"code_2025" varchar(10) NOT NULL,
	"title_2025" text NOT NULL,
	"lampiran_ref" varchar(50) DEFAULT 'BPS0000' NOT NULL,
	"conversion_type" varchar(50) DEFAULT '1_to_1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odon_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"odon_id" uuid NOT NULL,
	"kbli_category" "kbli_category_enum" NOT NULL,
	"kbli_code_2020" varchar(10),
	"kbli_title_2020" varchar(255),
	"kbli_code_2025" varchar(10),
	"kbli_title_2025" varchar(255),
	"pdrb_weight" real,
	"expenditure_component" "expenditure_component_enum" NOT NULL,
	"expenditure_weight" real,
	"impact_type" "impact_type_enum" DEFAULT 'positif' NOT NULL,
	"impact_narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odon_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid,
	"entry_date" timestamp with time zone NOT NULL,
	"published_date" timestamp with time zone NOT NULL,
	"source_media" "source_media_enum" NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"economic_phenomenon_summary" text NOT NULL,
	"quarter" "quarter_enum" NOT NULL,
	"year" smallint NOT NULL,
	"status" "odon_status_enum" DEFAULT 'draft' NOT NULL,
	"curator_notes" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_proposals" ADD CONSTRAINT "article_proposals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odon_classifications" ADD CONSTRAINT "odon_classifications_odon_id_odon_entries_id_fk" FOREIGN KEY ("odon_id") REFERENCES "public"."odon_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odon_entries" ADD CONSTRAINT "odon_entries_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odon_entries" ADD CONSTRAINT "odon_entries_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "article_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposals_created_at_idx" ON "article_proposals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kbli_conv_code_2020_idx" ON "kbli_conversions" USING btree ("code_2020");--> statement-breakpoint
CREATE INDEX "kbli_conv_code_2025_idx" ON "kbli_conversions" USING btree ("code_2025");--> statement-breakpoint
CREATE INDEX "odon_classifications_odon_id_idx" ON "odon_classifications" USING btree ("odon_id");--> statement-breakpoint
CREATE INDEX "odon_classifications_kbli_idx" ON "odon_classifications" USING btree ("kbli_category");--> statement-breakpoint
CREATE INDEX "odon_classifications_expenditure_idx" ON "odon_classifications" USING btree ("expenditure_component");--> statement-breakpoint
CREATE INDEX "odon_entries_date_idx" ON "odon_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "odon_entries_quarter_year_idx" ON "odon_entries" USING btree ("year","quarter");--> statement-breakpoint
CREATE INDEX "odon_entries_status_idx" ON "odon_entries" USING btree ("status");