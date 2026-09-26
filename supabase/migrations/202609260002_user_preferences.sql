create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reader_mode text not null default 'page' check (reader_mode in ('page','spread','continuous','horizontal')),
  reader_fit text not null default 'height' check (reader_fit in ('height','width')),
  reading_direction text not null default 'auto' check (reading_direction in ('auto','ltr','rtl')),
  home_section text not null default '/biblioteca' check (home_section in ('/biblioteca','/continuar','/lancamentos','/series','/favoritos')),
  confirm_mobile_downloads boolean not null default true,
  reduce_motion boolean not null default false,
  reduce_transparency boolean not null default false,
  theme text not null default 'dark' check (theme = 'dark'),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage their own preferences" on public.user_preferences;

create policy "Users manage their own preferences"
on public.user_preferences for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
