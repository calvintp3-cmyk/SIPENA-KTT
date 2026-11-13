ALTER TABLE "articles" ADD COLUMN "secondary_kbli_category" "kbli_category";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "secondary_kbli_impact" "kbli_impact";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "secondary_expenditure_component" "expenditure_component";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "secondary_expenditure_impact" "expenditure_impact";--> statement-breakpoint
CREATE INDEX "articles_sec_kbli_period_idx" ON "articles" USING btree ("secondary_kbli_category","year","quarter");--> statement-breakpoint
CREATE INDEX "articles_sec_exp_period_idx" ON "articles" USING btree ("secondary_expenditure_component","year","quarter");