-- Public registration starts without reading access. Existing owner remains active.
alter type public.app_role rename to app_role_old;
create type public.app_role as enum ('master', 'user');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.app_role
  using (case when role::text = 'owner' then 'master' else 'user' end)::public.app_role;
alter table public.profiles alter column role set default 'user';
drop type public.app_role_old;

alter table public.profiles
  add column access_status text not null default 'pending_payment'
    check (access_status in ('pending_payment', 'lifetime', 'blocked')),
  add column is_active boolean not null default false;
update public.profiles set role = 'master', access_status = 'lifetime', is_active = true
where lower(email) = 'rafaelancelmo.castro@gmail.com';

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'master') $$;

drop policy "Profiles are visible to their owner" on public.profiles;
create policy "Users see own profile and masters see all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_master());
create policy "Masters manage profiles" on public.profiles
  for update to authenticated using (public.is_master()) with check (public.is_master());

create table public.app_settings (
  id boolean primary key default true check (id),
  lifetime_price_cents integer not null default 2999 check (lifetime_price_cents > 0),
  pix_key text not null default '+5521994881355',
  pix_merchant_name text not null default 'RAFAEL ANCELMO',
  pix_merchant_city text not null default 'RIO DE JANEIRO',
  whatsapp_number text not null default '5521994881355',
  updated_at timestamptz not null default now()
);
insert into public.app_settings(id) values (true);
alter table public.app_settings enable row level security;
create policy "Authenticated users see checkout settings" on public.app_settings
  for select to authenticated using (true);
create policy "Masters update checkout settings" on public.app_settings
  for update to authenticated using (public.is_master()) with check (public.is_master());

alter table public.series add column cover_key text;
create table public.publisher_assets (
  publisher text primary key,
  logo_key text not null,
  updated_at timestamptz not null default now()
);
alter table public.publisher_assets enable row level security;
create policy "Authenticated users see publisher assets" on public.publisher_assets
  for select to authenticated using (true);
create policy "Masters manage publisher assets" on public.publisher_assets
  for all to authenticated using (public.is_master()) with check (public.is_master());
