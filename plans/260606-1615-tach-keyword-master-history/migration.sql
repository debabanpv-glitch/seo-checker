-- GĐ1 migration: backfill keywords master + keyword_id (chạy SAU drizzle-kit push)
-- Tái lập: docker exec -i seo-manager-pg psql -U postgres -d seomanager < migration.sql

INSERT INTO keywords (id, keyword, project_id, keyword_type, is_committed, cluster_id, created_at, updated_at)
SELECT gen_random_uuid()::text, kr.keyword, kr.project_id,
       MAX(kr.keyword_type), bool_or(kr.is_tracked), MAX(kr.cluster_id), now()::text, now()::text
FROM keyword_rankings kr
GROUP BY kr.keyword, kr.project_id;

UPDATE keyword_rankings kr SET keyword_id = k.id
FROM keywords k
WHERE k.keyword = kr.keyword AND k.project_id IS NOT DISTINCT FROM kr.project_id;
