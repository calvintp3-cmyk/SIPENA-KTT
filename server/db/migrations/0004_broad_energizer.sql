DROP INDEX "articles_llm_retry_partial_idx";--> statement-breakpoint
CREATE INDEX "articles_source_type_period_idx" ON "articles" USING btree ("source_type","year","quarter","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_geo_scope_period_idx" ON "articles" USING btree ("geographic_scope","year","quarter");--> statement-breakpoint
CREATE INDEX "articles_llm_retry_partial_idx" ON "articles" USING btree ("published_at" DESC NULLS LAST) WHERE "articles"."llm_status" = 'FAILED' AND "articles"."verification_status" = 'PENDING';--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_confidence_range_chk" CHECK ("articles"."llm_confidence" IS NULL OR ("articles"."llm_confidence" >= 0 AND "articles"."llm_confidence" <= 1));