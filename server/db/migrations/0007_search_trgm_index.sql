CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "articles_search_trgm_idx" ON "articles" USING gin ((
  lower("title" || ' ' || COALESCE("summary", '') || ' ' || "snippet_text")
) gin_trgm_ops);
