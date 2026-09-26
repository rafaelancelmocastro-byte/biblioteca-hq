create table if not exists public.offline_library (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comic_id uuid not null references public.comics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comic_id)
);

create index if not exists offline_library_user_id_idx on public.offline_library(user_id);

alter table public.offline_library enable row level security;

create policy "Users manage their own offline library"
on public.offline_library for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
