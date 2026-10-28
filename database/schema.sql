-- Student Portfolio Builder database schema
-- Run this complete script in Supabase SQL Editor.
-- This application uses custom server-side authentication. The Express API uses
-- a server-only service-role key and enforces ownership on every private query.
-- RLS is enabled as defense in depth; browser clients must never receive the service key.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint app_users_email_lowercase check (email = lower(email)),
  constraint app_users_email_length check (char_length(email) between 3 and 254),
  constraint app_users_password_hash_not_empty check (char_length(password_hash) > 20)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 50),
  headline text not null default '' check (char_length(headline) <= 140),
  bio text not null default '' check (char_length(bio) <= 1500),
  education text not null default '' check (char_length(education) <= 180),
  contact_email text,
  linkedin_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null check (char_length(trim(description)) between 1 and 2000),
  technologies text[] not null default '{}',
  project_url text,
  repository_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_technologies_limit check (cardinality(technologies) <= 12)
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  category text not null default 'Technical'
    check (category in ('Technical', 'Soft skill', 'Tools', 'Languages')),
  created_at timestamptz not null default now(),
  constraint skills_unique_per_user unique (user_id, name)
);

create index if not exists profiles_published_slug_idx on public.profiles (slug) where is_published = true;
create index if not exists projects_user_created_idx on public.projects (user_id, created_at desc);
create index if not exists projects_featured_idx on public.projects (user_id, is_featured desc, created_at desc);
create index if not exists skills_user_created_idx on public.skills (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

-- No direct browser access is required. RLS blocks access through Supabase's
-- anon/authenticated API roles. The server-only service role bypasses RLS, so
-- backend ownership checks are mandatory and are implemented in the Express routes.
alter table public.app_users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;

drop policy if exists "No direct browser access to app_users" on public.app_users;
create policy "No direct browser access to app_users" on public.app_users
for all to anon, authenticated using (false) with check (false);

drop policy if exists "No direct browser access to profiles" on public.profiles;
create policy "No direct browser access to profiles" on public.profiles
for all to anon, authenticated using (false) with check (false);

drop policy if exists "No direct browser access to projects" on public.projects;
create policy "No direct browser access to projects" on public.projects
for all to anon, authenticated using (false) with check (false);

drop policy if exists "No direct browser access to skills" on public.skills;
create policy "No direct browser access to skills" on public.skills
for all to anon, authenticated using (false) with check (false);

-- Verify after running:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename in ('app_users','profiles','projects','skills');
