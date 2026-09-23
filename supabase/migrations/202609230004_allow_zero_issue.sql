-- Issue 00 is a valid publication preceding issue 01.
alter table public.comics drop constraint if exists comics_issue_number_check;
alter table public.comics add constraint comics_issue_number_check check (issue_number >= 0);
