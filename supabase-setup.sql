-- Oral Prep Database Setup
-- Run this script in your Supabase SQL Editor

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create project_documents table
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  path text not null,
  size_bytes bigint not null check (size_bytes <= 50 * 1024 * 1024),
  content_type text not null,
  created_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_documents_project on public.project_documents(project_id);
create index if not exists idx_projects_owner on public.projects(owner_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_documents enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Profile is self" on public.profiles;
drop policy if exists "Projects are owned" on public.projects;
drop policy if exists "Docs through owned project" on public.project_documents;

-- RLS Policies for profiles
create policy "Profile is self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- RLS Policies for projects
create policy "Projects are owned" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- RLS Policies for project_documents
create policy "Docs through owned project" on public.project_documents
  for all using (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Create storage bucket for project documents
insert into storage.buckets (id, name, public) 
values ('project-docs','project-docs', false)
on conflict (id) do nothing;

-- Drop existing storage policies if they exist
drop policy if exists "Users read own objects" on storage.objects;
drop policy if exists "Users write own objects" on storage.objects;
drop policy if exists "Users update/delete own objects" on storage.objects;

-- Storage policies: user-scoped paths users/{uid}/{projectId}/docs/*
create policy "Users read own objects" on storage.objects 
for select using (
  bucket_id = 'project-docs' and 
  (storage.foldername(name))[1] = 'users' and
  (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Users write own objects" on storage.objects 
for insert with check (
  bucket_id = 'project-docs' and 
  (storage.foldername(name))[1] = 'users' and
  (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Users update/delete own objects" on storage.objects 
for delete using (
  bucket_id = 'project-docs' and 
  (storage.foldername(name))[1] = 'users' and
  (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Users update own objects" on storage.objects 
for update using (
  bucket_id = 'project-docs' and 
  (storage.foldername(name))[1] = 'users' and
  (storage.foldername(name))[2] = auth.uid()::text
);

-- =============================================================
-- Document pages (per-page rendered images)
-- =============================================================

-- Table to index each rendered page image of a document
create table if not exists public.document_pages (
  document_id uuid not null references public.project_documents(id) on delete cascade,
  page_number int not null check (page_number >= 1),
  image_path text not null, -- storage path within bucket 'project-docs'
  width int,
  height int,
  created_at timestamptz default now(),
  primary key (document_id, page_number)
);

create index if not exists idx_document_pages_doc on public.document_pages(document_id);

alter table public.document_pages enable row level security;

-- Policies: allow access only through owned project
drop policy if exists "Doc pages through owned project" on public.document_pages;
create policy "Doc pages through owned project" on public.document_pages
  for all using (
    exists (
      select 1
      from public.project_documents d
      join public.projects p on p.id = d.project_id
      where d.id = document_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.project_documents d
      join public.projects p on p.id = d.project_id
      where d.id = document_id and p.owner_id = auth.uid()
    )
  );

-- Function to enforce max 10 documents per project
create or replace function public.enforce_max_documents()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.project_documents d where d.project_id = new.project_id) >= 10 then
    raise exception 'Vous ne pouvez pas ajouter plus de 10 documents à ce projet.';
  end if;
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists trg_max_docs on public.project_documents;

-- Create trigger for max documents constraint
create trigger trg_max_docs
before insert on public.project_documents
for each row execute function public.enforce_max_documents();

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger for new user profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create quizzes table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create quiz item type enum
create type public.quiz_item_type as enum ('mcq', 'flashcard', 'open');

-- Create quiz_items table
create table if not exists public.quiz_items (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type public.quiz_item_type not null,
  question text not null,
  options jsonb, -- For MCQ: ["option1", "option2", ...], for flashcard: null
  answer text not null, -- MCQ: correct option index or text, flashcard: back side, open: model answer
  explanation text,
  source_document_id uuid references public.project_documents(id) on delete set null,
  page_from integer,
  page_to integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create quiz_reviews table for spaced repetition
create table if not exists public.quiz_reviews (
  id uuid primary key default gen_random_uuid(),
  quiz_item_id uuid not null references public.quiz_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ease real not null default 2.5, -- SM-2 ease factor
  interval_days integer not null default 1,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz default now(),
  review_count integer not null default 0,
  created_at timestamptz default now()
);

-- Create project_notes table for agent saved explanations
create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid references public.project_documents(id) on delete cascade,
  page integer,
  title text,
  content text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create API usage tracking table for rate limits
create table if not exists public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('vision', 'text')),
  count integer not null default 1,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, action, date)
);

-- Create indexes
create index if not exists idx_quizzes_project on public.quizzes(project_id);
create index if not exists idx_quiz_items_quiz on public.quiz_items(quiz_id);
create index if not exists idx_quiz_items_source on public.quiz_items(source_document_id);
create index if not exists idx_quiz_reviews_user_due on public.quiz_reviews(user_id, due_at);
create index if not exists idx_quiz_reviews_item on public.quiz_reviews(quiz_item_id);
create index if not exists idx_notes_project on public.project_notes(project_id);
create index if not exists idx_api_usage_user_date on public.api_usage(user_id, date);

-- Enable Row Level Security
alter table public.quizzes enable row level security;
alter table public.quiz_items enable row level security;
alter table public.quiz_reviews enable row level security;
alter table public.project_notes enable row level security;
alter table public.api_usage enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Quizzes through owned project" on public.quizzes;
drop policy if exists "Quiz items through owned quiz" on public.quiz_items;
drop policy if exists "Quiz reviews are personal" on public.quiz_reviews;
drop policy if exists "Notes through owned project" on public.project_notes;
drop policy if exists "API usage is personal" on public.api_usage;

-- RLS Policies for quizzes
create policy "Quizzes through owned project" on public.quizzes
  for all using (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- RLS Policies for quiz_items
create policy "Quiz items through owned quiz" on public.quiz_items
  for all using (
    exists(
      select 1 from public.quizzes q 
      join public.projects p on p.id = q.project_id 
      where q.id = quiz_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists(
      select 1 from public.quizzes q 
      join public.projects p on p.id = q.project_id 
      where q.id = quiz_id and p.owner_id = auth.uid()
    )
  );

-- RLS Policies for quiz_reviews
create policy "Quiz reviews are personal" on public.quiz_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS Policies for project_notes
create policy "Notes through owned project" on public.project_notes
  for all using (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- RLS Policies for api_usage
create policy "API usage is personal" on public.api_usage
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists trg_quizzes_updated on public.quizzes;
create trigger trg_quizzes_updated
  before update on public.quizzes
  for each row execute function public.update_updated_at();

drop trigger if exists trg_quiz_items_updated on public.quiz_items;
create trigger trg_quiz_items_updated
  before update on public.quiz_items
  for each row execute function public.update_updated_at();

drop trigger if exists trg_notes_updated on public.project_notes;
create trigger trg_notes_updated
  before update on public.project_notes
  for each row execute function public.update_updated_at();

-- Function to increment API usage
create or replace function public.increment_api_usage(p_user_id uuid, p_action text)
returns void language plpgsql as $$
begin
  insert into public.api_usage (user_id, action, count, date)
  values (p_user_id, p_action, 1, current_date)
  on conflict (user_id, action, date) 
  do update set count = public.api_usage.count + 1;
end;
$$;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
grant all on public.projects to anon, authenticated;
grant all on public.project_documents to anon, authenticated;
grant all on public.quizzes to anon, authenticated;
grant all on public.quiz_items to anon, authenticated;
grant all on public.quiz_reviews to anon, authenticated;
grant all on public.project_notes to anon, authenticated;
grant all on public.api_usage to anon, authenticated;
grant execute on function public.increment_api_usage to anon, authenticated;


-- =============================================
-- Bulk Oral Quiz: Batches and Questions Schema
-- =============================================

-- quiz_batch groups a set of generated/imported oral questions (typically 30)
create table if not exists public.quiz_batch (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text,
  source_type text not null check (source_type in ('bulk','pdf')),
  total integer not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- quiz_questions are normalized oral questions with rubric and follow-ups
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  batch_id uuid references public.quiz_batch(id) on delete set null,
  raw text,
  question text not null,
  canonical_answer text not null,
  key_points jsonb not null,
  acceptable_synonyms jsonb,
  hints text,
  followups jsonb,
  topic text,
  difficulty text check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_quiz_batch_project on public.quiz_batch(project_id);
create index if not exists idx_quiz_questions_project on public.quiz_questions(project_id);
create index if not exists idx_quiz_questions_batch on public.quiz_questions(batch_id);

-- Enable RLS
alter table public.quiz_batch enable row level security;
alter table public.quiz_questions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Quiz batch through owned project" on public.quiz_batch;
drop policy if exists "Quiz questions through owned project" on public.quiz_questions;

-- RLS policies: allow only owners of the project to access
create policy "Quiz batch through owned project" on public.quiz_batch
  for all using (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "Quiz questions through owned project" on public.quiz_questions
  for all using (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists(select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Grants
grant all on public.quiz_batch to anon, authenticated;
grant all on public.quiz_questions to anon, authenticated;
