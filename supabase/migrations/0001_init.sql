-- Classes a user is tracking
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  term text,
  created_at timestamptz not null default now()
);

-- Uploaded syllabus files + their parsed structure (Gemini "initial parsing" step)
create table public.syllabi (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  parsed_data jsonb,
  parsed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A generated study plan for a class (one active plan per class for now)
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  syllabus_id uuid references public.syllabi(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Headings/topics within a plan (Gemini "heading generation" step)
create table public.study_plan_topics (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  order_index int not null,
  heading text not null,
  week_label text,
  due_date date,
  source_excerpt text,
  created_at timestamptz not null default now()
);

create index syllabi_class_id_idx on public.syllabi (class_id);
create index study_plans_class_id_idx on public.study_plans (class_id);
create index study_plan_topics_plan_id_idx on public.study_plan_topics (study_plan_id);

-- Row Level Security: everything scoped to the owning user via classes.user_id
alter table public.classes enable row level security;
alter table public.syllabi enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_topics enable row level security;

create policy "classes_owner" on public.classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "syllabi_owner" on public.syllabi
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid())
  );

create policy "study_plans_owner" on public.study_plans
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid())
  );

create policy "study_plan_topics_owner" on public.study_plan_topics
  for all using (
    exists (
      select 1 from public.study_plans sp
      join public.classes c on c.id = sp.class_id
      where sp.id = study_plan_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.study_plans sp
      join public.classes c on c.id = sp.class_id
      where sp.id = study_plan_id and c.user_id = auth.uid()
    )
  );

-- Storage bucket for uploaded syllabus PDFs (private, path-scoped per user)
insert into storage.buckets (id, name, public)
values ('syllabi', 'syllabi', false)
on conflict (id) do nothing;

create policy "syllabi_storage_owner_select" on storage.objects
  for select using (bucket_id = 'syllabi' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "syllabi_storage_owner_insert" on storage.objects
  for insert with check (bucket_id = 'syllabi' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "syllabi_storage_owner_delete" on storage.objects
  for delete using (bucket_id = 'syllabi' and (storage.foldername(name))[1] = auth.uid()::text);
