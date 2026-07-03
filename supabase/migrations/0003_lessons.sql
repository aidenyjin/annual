-- Barebones lesson structure: one (for now) lesson per leaf topic
-- (a topic with no subtopics, or a subtopic itself). Content is generated
-- later; this just establishes the shape and navigation.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.study_plan_topics(id) on delete cascade,
  order_index int not null default 0,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

create index lessons_topic_id_idx on public.lessons (topic_id);

alter table public.lessons enable row level security;

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
