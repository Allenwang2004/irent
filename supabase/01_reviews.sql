-- Customer reviews and posts about iRent, collected by scraper/irent_scraper.py.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create table public.reviews (
  id bigint generated always as identity primary key,
  source text not null check (source in ('ptt', 'dcard', 'google_play', 'app_store')),
  source_id text not null,
  url text,
  board text,
  title text,
  author text,
  posted_at timestamptz,
  rating smallint check (rating between 1 and 5),
  matched_keywords text[] not null default '{}',
  snippets text[] not null default '{}',
  content text,
  comments text,
  -- Problem categories assigned by scripts/import-reviews.mjs.
  categories text[] not null default '{}',
  -- Team triage state, edited from the back office; the importer never overwrites these.
  -- importance: whether the problem is worth acting on; status: how far handling has got.
  importance text not null default 'unmarked' check (importance in ('unmarked', 'important', 'unimportant')),
  status text not null default 'open' check (status in ('open', 'discussing', 'resolved', 'ignored')),
  note text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index reviews_posted_at_idx on public.reviews (posted_at desc);
create index reviews_categories_idx on public.reviews using gin (categories);
create index reviews_importance_idx on public.reviews (importance);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- RLS on with no policies: only the server-side secret key can read or write.
-- Policies for signed-in operations staff come with the auth work.
alter table public.reviews enable row level security;
