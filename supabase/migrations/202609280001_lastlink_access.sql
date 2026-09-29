create table if not exists public.lastlink_webhook_events (
  event_id text primary key,
  event_name text not null,
  is_test boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.lastlink_purchases (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique references public.lastlink_webhook_events(event_id) on delete cascade,
  buyer_email text not null,
  buyer_name text,
  buyer_id text,
  payment_id text,
  offer_id text,
  offer_code text,
  amount numeric(12,2),
  payment_method text,
  status text not null check (status in ('confirmed','refunded','chargeback')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lastlink_purchases_email_idx on public.lastlink_purchases(lower(buyer_email));
create index if not exists lastlink_purchases_status_idx on public.lastlink_purchases(status, created_at desc);

alter table public.lastlink_webhook_events enable row level security;
alter table public.lastlink_purchases enable row level security;

drop policy if exists "Masters see Lastlink webhook events" on public.lastlink_webhook_events;
create policy "Masters see Lastlink webhook events"
on public.lastlink_webhook_events for select to authenticated
using (public.is_master());

drop policy if exists "Masters see Lastlink purchases" on public.lastlink_purchases;
create policy "Masters see Lastlink purchases"
on public.lastlink_purchases for select to authenticated
using (public.is_master());
