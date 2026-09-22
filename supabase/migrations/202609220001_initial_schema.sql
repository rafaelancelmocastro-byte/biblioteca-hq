create extension if not exists "pgcrypto";

create type public.app_role as enum ('owner', 'guest');
create type public.reading_status as enum ('not_started', 'reading', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'guest',
  preferences jsonb not null default '{"readerMode":"single","readerZoom":100,"gridDensity":"comfortable","autoMarkCompletedAtPercent":95}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text not null,
  start_year smallint not null check (start_year between 1800 and 2200),
  end_year smallint check (end_year between start_year and 2200),
  total_issues_expected integer check (total_issues_expected > 0),
  description text not null default '',
  banner_tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title, publisher, start_year)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias text,
  publisher text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, publisher)
);

create table public.comics (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete restrict,
  title text not null,
  issue_number integer not null check (issue_number > 0),
  volume integer check (volume > 0),
  publication_year smallint not null check (publication_year between 1800 and 2200),
  publisher text not null,
  total_pages integer not null check (total_pages > 0),
  synopsis text not null default '',
  writers text[] not null default '{}',
  pencillers text[] not null default '{}',
  colorists text[] not null default '{}',
  tags text[] not null default '{}',
  file_size_mb numeric(10, 2) check (file_size_mb >= 0),
  file_name text not null,
  pdf_key text unique,
  cover_key text unique,
  cover_palette jsonb not null default '{"primary":"#0f172a","secondary":"#334155","accent":"#f59e0b","badgeBg":"#111827","badgeText":"#ffffff","pattern":"minimal"}'::jsonb,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (series_id, issue_number, volume)
);

create table public.comic_characters (
  comic_id uuid not null references public.comics(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  primary key (comic_id, character_id)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comic_id uuid not null references public.comics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comic_id)
);

create table public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comic_id uuid not null references public.comics(id) on delete cascade,
  current_page integer not null default 0 check (current_page >= 0),
  total_pages integer not null check (total_pages > 0),
  percentage numeric(5, 2) generated always as (
    round((current_page::numeric / total_pages::numeric) * 100, 2)
  ) stored,
  status public.reading_status not null default 'not_started',
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, comic_id),
  check (current_page <= total_pages),
  check (
    (status = 'not_started' and current_page = 0)
    or (status = 'reading' and current_page between 1 and total_pages - 1)
    or (status = 'completed' and current_page = total_pages)
  )
);

create index comics_series_id_idx on public.comics(series_id);
create index comics_added_at_idx on public.comics(added_at desc);
create index comic_characters_character_id_idx on public.comic_characters(character_id);
create index favorites_user_id_idx on public.favorites(user_id);
create index reading_progress_user_last_read_idx on public.reading_progress(user_id, last_read_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', new.email));
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger series_set_updated_at
before update on public.series
for each row execute function public.set_updated_at();

create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

create trigger comics_set_updated_at
before update on public.comics
for each row execute function public.set_updated_at();

create trigger reading_progress_set_updated_at
before update on public.reading_progress
for each row execute function public.set_updated_at();

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.series enable row level security;
alter table public.characters enable row level security;
alter table public.comics enable row level security;
alter table public.comic_characters enable row level security;
alter table public.favorites enable row level security;
alter table public.reading_progress enable row level security;

create policy "Profiles are visible to their owner"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Authenticated users can read the catalog"
on public.series for select to authenticated
using (true);

create policy "Authenticated users can read characters"
on public.characters for select to authenticated
using (true);

create policy "Authenticated users can read comics"
on public.comics for select to authenticated
using (true);

create policy "Authenticated users can read comic characters"
on public.comic_characters for select to authenticated
using (true);

create policy "Users manage their own favorites"
on public.favorites for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users manage their own reading progress"
on public.reading_progress for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
