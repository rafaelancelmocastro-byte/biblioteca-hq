alter table public.comics
  add column if not exists content_type text not null default 'comic'
    check (content_type in ('comic', 'graphic_novel', 'manga', 'manhwa')),
  add column if not exists reading_direction text not null default 'ltr'
    check (reading_direction in ('ltr', 'rtl'));

create index if not exists comics_content_type_idx on public.comics(content_type) where deleted_at is null;
