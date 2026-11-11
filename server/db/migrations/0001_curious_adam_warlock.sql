CREATE TYPE "public"."synthesis_style" AS ENUM('BRS_FORMAL', 'EXECUTIVE_BRIEF', 'BULLET_POINTS');--> statement-breakpoint
CREATE TABLE "synthesis_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" smallint NOT NULL,
	"quarter" smallint NOT NULL,
	"dimension" text NOT NULL,
	"target_code" text NOT NULL,
	"target_label" text NOT NULL,
	"style" "synthesis_style" DEFAULT 'BRS_FORMAL' NOT NULL,
	"title" text NOT NULL,
	"narrative_markdown" text NOT NULL,
	"generation_mode" text DEFAULT 'template' NOT NULL,
	"model_used" text,
	"notice" text,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "synthesis_drafts_quarter_range_chk" CHECK ("synthesis_drafts"."quarter" BETWEEN 1 AND 4),
	CONSTRAINT "synthesis_drafts_year_range_chk" CHECK ("synthesis_drafts"."year" BETWEEN 2000 AND 2100),
	CONSTRAINT "synthesis_drafts_dimension_chk" CHECK ("synthesis_drafts"."dimension" IN ('kbli', 'expenditure')),
	CONSTRAINT "synthesis_drafts_mode_chk" CHECK ("synthesis_drafts"."generation_mode" IN ('gemini', 'template')),
	CONSTRAINT "synthesis_drafts_article_count_chk" CHECK ("synthesis_drafts"."article_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "synthesis_drafts" ADD CONSTRAINT "synthesis_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthesis_drafts" ADD CONSTRAINT "synthesis_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "synthesis_drafts_period_updated_idx" ON "synthesis_drafts" USING btree ("year","quarter","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "synthesis_drafts_target_idx" ON "synthesis_drafts" USING btree ("dimension","target_code");--> statement-breakpoint
CREATE INDEX "synthesis_drafts_created_by_idx" ON "synthesis_drafts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "synthesis_drafts_updated_by_idx" ON "synthesis_drafts" USING btree ("updated_by");