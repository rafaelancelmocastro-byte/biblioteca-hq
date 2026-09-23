alter table public.comics drop constraint if exists comics_content_type_check;
alter table public.comics add constraint comics_content_type_check
  check (content_type in ('comic', 'graphic_novel', 'manga', 'manhwa', 'book'));
