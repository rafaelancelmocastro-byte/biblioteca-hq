create table if not exists public.series_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

create index if not exists series_favorites_user_id_idx on public.series_favorites(user_id);
alter table public.series_favorites enable row level security;

create policy "Users manage their own series favorites"
on public.series_favorites for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
