-- Real vehicles, pickup and return inspections, and known damage.
--
-- Replaces the demo-only return flow from 02_returns.sql and 03_analyses.sql.
-- WARNING: this drops the old demo tables (rentals, return_sessions,
-- return_photos, photo_analyses, alerts) and everything in them. Photos already
-- in the old return-photos bucket are left untouched.
--
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.

drop function if exists public.claim_return_session(text, integer, integer);
drop table if exists public.alerts, public.photo_analyses, public.return_photos,
  public.return_sessions, public.rentals cascade;

-- ---------------------------------------------------------------- vehicles

-- A car is created in the back office as 'registering', photographed once with
-- the phone (registration inspection) and then becomes 'available'.
create table public.vehicles (
  id bigint generated always as identity primary key,
  plate text not null unique,
  car_model text not null,
  status text not null default 'registering'
    check (status in ('registering', 'available', 'in_use', 'retired')),
  -- Secret part of the phone registration link, so only staff can register photos.
  registration_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One pickup-to-return cycle of a vehicle.
create table public.rentals (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.vehicles (id),
  order_no text not null unique,
  status text not null default 'picking_up'
    check (status in ('picking_up', 'in_use', 'returned', 'cancelled')),
  started_at timestamptz not null default now(),
  picked_up_at timestamptz,
  returned_at timestamptz
);

-- At most one open rental per vehicle.
create unique index rentals_one_open_per_vehicle
  on public.rentals (vehicle_id) where status in ('picking_up', 'in_use');

-- ---------------------------------------------------------------- inspections

-- A set of photos taken at one moment: registration (baseline), pickup or return.
-- kind keeps pickups and returns apart in queries, storage paths and the back office.
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id bigint not null references public.vehicles (id),
  rental_id bigint references public.rentals (id),
  kind text not null check (kind in ('registration', 'pickup', 'return')),
  status text not null default 'uploading' check (status in ('uploading', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  -- Worker queue (registrations need no analysis and are marked done on submit).
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'running', 'done', 'error')),
  analysis_worker text,
  analysis_claimed_at timestamptz,
  analysis_finished_at timestamptz,
  analysis_attempts integer not null default 0,
  analysis_error text,
  check ((kind = 'registration') = (rental_id is null))
);

create index inspections_vehicle_idx on public.inspections (vehicle_id, submitted_at desc);
create index inspections_queue_idx on public.inspections (submitted_at)
  where status = 'submitted' and analysis_status in ('pending', 'running');

-- ---------------------------------------------------------------- known damage

-- Damage the car already has. Shown to renters as "photograph this to protect
-- yourself". Comes from registration (staff) or from a confirmed alert.
create table public.vehicle_damages (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.vehicles (id) on delete cascade,
  location text not null,
  damage_type text not null check (damage_type in ('刮傷', '凹陷', '破裂', '掉漆', '燈具破損', '其他')),
  severity text not null default '輕微' check (severity in ('輕微', '中等', '嚴重')),
  -- Angle it is best seen from (iRent image_type), to guide the photo.
  image_type smallint check (image_type in (1, 2, 3, 4, 10, 11)),
  note text,
  source text not null check (source in ('registration', 'alert')),
  status text not null default 'active' check (status in ('active', 'repaired')),
  created_at timestamptz not null default now(),
  repaired_at timestamptz
);

create index vehicle_damages_active_idx on public.vehicle_damages (vehicle_id) where status = 'active';

-- ---------------------------------------------------------------- photos

-- category:
--   card          fuel/parking card holder on the sun visor (required)
--   angle         the 6 required views; image_type 1-4 exterior, 10-11 interior
--   known_damage  optional close-up of a recorded damage (damage_id)
--   extra         optional damage the renter points out: pre-existing at pickup,
--                 admitted by the renter at return
create table public.inspection_photos (
  id bigint generated always as identity primary key,
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  slot text not null,
  category text not null check (category in ('card', 'angle', 'known_damage', 'extra')),
  image_type smallint check (image_type in (1, 2, 3, 4, 10, 11)),
  damage_id bigint references public.vehicle_damages (id) on delete set null,
  location text,
  note text,
  storage_path text not null,
  width integer,
  height integer,
  quality jsonb not null default '{}',
  verdict text not null check (verdict in ('pass', 'warn')),
  rejected_shots integer not null default 0,
  created_at timestamptz not null default now(),
  unique (inspection_id, slot),
  check ((category = 'angle') = (image_type is not null))
);

-- Registration photos can be the reference picture of a known damage.
alter table public.vehicle_damages
  add column reference_photo_id bigint references public.inspection_photos (id) on delete set null;

-- ---------------------------------------------------------------- analysis

create table public.photo_analyses (
  id bigint generated always as identity primary key,
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  photo_id bigint not null references public.inspection_photos (id) on delete cascade,
  -- compare: angle photo vs the baseline at the same angle
  -- tidy:    interior cleanliness and left-behind items
  -- card:    are the fuel and parking cards in the holder
  -- describe: what damage a renter-reported photo shows
  kind text not null check (kind in ('compare', 'tidy', 'card', 'describe')),
  baseline_photo_id bigint references public.inspection_photos (id) on delete set null,
  model text not null,
  runs integer not null,
  verdict text not null,
  confidence real,
  results jsonb not null default '[]',
  latency_ms integer,
  created_at timestamptz not null default now(),
  unique (photo_id, kind)
);

create index photo_analyses_inspection_idx on public.photo_analyses (inspection_id);

-- kind:
--   new_damage         return differs from this rental's pickup (renter's period)
--   pickup_difference  pickup differs from the car's previous inspection
--   reported_damage    damage the renter photographed themselves (extra photos)
--   dirty, left_item   interior check
--   card_missing       fuel or parking card not in the holder
--   needs_review       could not compare or the model failed
create table public.alerts (
  id bigint generated always as identity primary key,
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  vehicle_id bigint not null references public.vehicles (id) on delete cascade,
  photo_id bigint references public.inspection_photos (id) on delete set null,
  kind text not null check (kind in (
    'new_damage', 'pickup_difference', 'reported_damage',
    'dirty', 'left_item', 'card_missing', 'needs_review'
  )),
  severity text not null check (severity in ('high', 'medium', 'low')),
  message text not null,
  -- Structured findings, e.g. damage items {location, type, severity}, to prefill
  -- a known-damage record when an operator confirms the alert.
  details jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  note text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index alerts_open_idx on public.alerts (created_at desc) where status = 'open';

-- ---------------------------------------------------------------- RLS, bucket

alter table public.vehicles enable row level security;
alter table public.rentals enable row level security;
alter table public.inspections enable row level security;
alter table public.vehicle_damages enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.photo_analyses enable row level security;
alter table public.alerts enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- worker queue

-- Hand the oldest submitted pickup or return to one worker (see worker/README.md).
create function public.claim_inspection(
  p_worker text,
  p_stale_minutes integer default 15,
  p_max_attempts integer default 3
) returns setof public.inspections
language sql
as $$
  update public.inspections i
  set analysis_status = 'running',
      analysis_worker = p_worker,
      analysis_claimed_at = now(),
      analysis_attempts = i.analysis_attempts + 1,
      analysis_error = null
  where i.id = (
    select id from public.inspections
    where status = 'submitted'
      and kind in ('pickup', 'return')
      and analysis_attempts < p_max_attempts
      and (
        analysis_status = 'pending'
        or (analysis_status = 'running' and analysis_claimed_at < now() - make_interval(mins => p_stale_minutes))
      )
    order by submitted_at
    for update skip locked
    limit 1
  )
  returning i.*;
$$;

revoke execute on function public.claim_inspection(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_inspection(text, integer, integer) to service_role;
