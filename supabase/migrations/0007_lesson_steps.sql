-- A lesson is now played as a sequence of steps (teaching cards interleaved
-- with questions), Duolingo-style, rather than a content blob + quiz. Stored
-- as jsonb so the step format can keep evolving without migrations.
alter table public.lessons add column if not exists steps jsonb;
