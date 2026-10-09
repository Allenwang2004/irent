-- VLM analysis of submitted returns, done by the lab-server worker (worker/).
-- Requires 02_returns.sql (on the feature/app branch). Run once in the
-- Supabase dashboard: SQL Editor > New query > paste > Run.

-- Queue state lives on the return itself: a submitted return with
-- analysis_status = 'pending' is waiting for a worker.
alter table public.return_sessions
  add column analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'running', 'done', 'error')),
  add column analysis_worker text,
  add column analysis_claimed_at timestamptz,
  add column analysis_finished_at timestamptz,
  add column analysis_attempts integer not null default 0,
  add column analysis_error text;

create index return_sessions_analysis_queue_idx
  on public.return_sessions (submitted_at)
  where status = 'submitted' and analysis_status in ('pending', 'running');

-- One row per photo per analysis kind.
--   compare: exterior photo (image_type 1-4) vs the same car's previous return at the same angle
--   tidy:    interior photo (image_type 10, 11) cleanliness and left-behind items
create table public.photo_analyses (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.return_sessions (id) on delete cascade,
  photo_id bigint not null references public.return_photos (id) on delete cascade,
  kind text not null check (kind in ('compare', 'tidy')),
  -- compare only: the earlier photo it was compared against; null when the car has no earlier return.
  baseline_photo_id bigint references public.return_photos (id) on delete set null,
  model text not null,
  runs integer not null,
  -- Majority-vote outcome across runs.
  verdict text not null check (verdict in (
    'no_new_damage', 'new_damage', 'not_comparable', 'no_baseline',
    'clean', 'normal', 'dirty', 'error'
  )),
  confidence real,
  -- Every run's raw JSON answer, for audit and for the back office.
  results jsonb not null default '[]',
  latency_ms integer,
  created_at timestamptz not null default now(),
  unique (photo_id, kind)
);

create index photo_analyses_session_idx on public.photo_analyses (session_id);

-- Something an operator should look at. Created by the worker, handled in the back office.
create table public.alerts (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.return_sessions (id) on delete cascade,
  photo_id bigint references public.return_photos (id) on delete set null,
  kind text not null check (kind in ('new_damage', 'dirty', 'left_item', 'needs_review')),
  severity text not null check (severity in ('high', 'medium', 'low')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  note text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index alerts_open_idx on public.alerts (created_at desc) where status = 'open';

alter table public.photo_analyses enable row level security;
alter table public.alerts enable row level security;

-- Hand the oldest waiting return to one worker. FOR UPDATE SKIP LOCKED lets
-- several workers poll at once without taking the same return; a return
-- stuck in 'running' longer than p_stale_minutes (worker crashed) is handed
-- out again, up to p_max_attempts times.
create function public.claim_return_session(
  p_worker text,
  p_stale_minutes integer default 15,
  p_max_attempts integer default 3
) returns setof public.return_sessions
language sql
as $$
  update public.return_sessions s
  set analysis_status = 'running',
      analysis_worker = p_worker,
      analysis_claimed_at = now(),
      analysis_attempts = s.analysis_attempts + 1,
      analysis_error = null
  where s.id = (
    select id from public.return_sessions
    where status = 'submitted'
      and analysis_attempts < p_max_attempts
      and (
        analysis_status = 'pending'
        or (analysis_status = 'running' and analysis_claimed_at < now() - make_interval(mins => p_stale_minutes))
      )
    order by submitted_at
    for update skip locked
    limit 1
  )
  returning s.*;
$$;

-- Only the server-side secret key may call it.
revoke execute on function public.claim_return_session(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_return_session(text, integer, integer) to service_role;
