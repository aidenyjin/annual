-- Completion tracking for lessons and topics.
alter table public.lessons add column if not exists completed_at timestamptz;
alter table public.study_plan_topics add column if not exists completed_at timestamptz;
