-- Distinct works can share a collection and issue number. Review duplicates in
-- the application using the file hash and complete editorial identity.
alter table public.comics drop constraint if exists comics_series_id_issue_number_volume_key;
alter table public.comics add column if not exists file_sha256 text;
alter table public.comics add column if not exists cover_thumb_key text;
alter table public.comics add column if not exists deleted_at timestamptz;
alter table public.series add column if not exists deleted_at timestamptz;
alter table public.comics alter column series_id drop not null;

create index if not exists comics_active_identity_idx on public.comics
  (series_id, volume, issue_number, publication_year, lower(title)) where deleted_at is null;
create index if not exists comics_active_hash_idx on public.comics (file_sha256)
  where deleted_at is null and file_sha256 is not null;
create index if not exists comics_active_added_idx on public.comics (added_at desc)
  where deleted_at is null;
create index if not exists series_active_title_idx on public.series (lower(title), lower(publisher))
  where deleted_at is null;

drop policy if exists "Authenticated users can read comics" on public.comics;
create policy "Authenticated users can read active comics"
on public.comics for select to authenticated using (deleted_at is null);
drop policy if exists "Authenticated users can read the catalog" on public.series;
create policy "Authenticated users can read active series"
on public.series for select to authenticated using (deleted_at is null);
