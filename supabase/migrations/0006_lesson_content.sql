-- Lesson content prototype: an outline (the "what to examine" plan) and a
-- quiz live on each lesson row as jsonb, so the format can be iterated on
-- without schema churn. Normalise into real tables once the shape settles.
alter table public.lessons add column if not exists outline jsonb;
alter table public.lessons add column if not exists quiz jsonb;
