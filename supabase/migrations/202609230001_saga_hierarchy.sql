alter table public.series add column if not exists parent_series_id uuid references public.series(id) on delete set null;
create index if not exists series_parent_series_id_idx on public.series(parent_series_id);
alter table public.series add constraint series_parent_not_self check (parent_series_id is distinct from id);

update public.series saga
set parent_series_id = parent.id
from public.series parent
where lower(saga.title) in ('dinastia kang', 'a dinastia kang')
  and lower(parent.title) = 'vingadores'
  and lower(saga.publisher) = lower(parent.publisher)
  and saga.deleted_at is null and parent.deleted_at is null;
