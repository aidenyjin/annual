alter table public.study_plan_topics
  add column parent_id uuid references public.study_plan_topics(id) on delete cascade;

create index study_plan_topics_parent_id_idx on public.study_plan_topics (parent_id);
