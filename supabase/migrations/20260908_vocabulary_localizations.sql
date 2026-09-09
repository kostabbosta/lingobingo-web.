begin;
create table if not exists public.vocabulary_localizations (
  english_word text not null check (english_word = lower(trim(english_word)) and length(english_word) between 1 and 120),
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$'),
  translation text,
  examples jsonb not null default '[]'::jsonb check (jsonb_typeof(examples) = 'array'),
  status text not null default 'draft' check (status in ('draft','reviewed','machine','missing')),
  updated_at timestamptz not null default now(),
  primary key (english_word,language)
);
alter table public.vocabulary_localizations enable row level security;
revoke all on public.vocabulary_localizations from anon, authenticated;
grant select on public.vocabulary_localizations to anon, authenticated;
create policy "Read published vocabulary translations" on public.vocabulary_localizations
  for select to anon, authenticated using (true);
-- Content is edited only by project administrators, never by public clients.
commit;
