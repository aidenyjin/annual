-- Idempotent catch-up: safe to run any number of times. Brings a database
-- that has only the initial schema (0001) up to date with the subtopic
-- hierarchy (0002) and lessons (0003) without erroring if they already exist.

-- 0002: subtopic hierarchy
alter table public.study_plan_topics
  add column if not exists parent_id uuid
  references public.study_plan_topics(id) on delete cascade;

create index if not exists study_plan_topics_parent_id_idx
  on public.study_plan_topics (parent_id);

-- 0003: lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.study_plan_topics(id) on delete cascade,
  order_index int not null default 0,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists lessons_topic_id_idx on public.lessons (topic_id);

alter table public.lessons enable row level security;

drop policy if exists "lessons_owner" on public.lessons;
create policy "lessons_owner" on public.lessons
  for all using (
    exists (
      select 1 from public.study_plan_topics t
      join public.study_plans sp on sp.id = t.study_plan_id
      join public.classes c on c.id = sp.class_id
      where t.id = topic_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.study_plan_topics t
      join public.study_plans sp on sp.id = t.study_plan_id
      join public.classes c on c.id = sp.class_id
      where t.id = topic_id and c.user_id = auth.uid()
    )
  );
