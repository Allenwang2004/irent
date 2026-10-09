-- Car-return photo flow used by the mobile simulation (mobile/) and shown in the
-- back office (web/). Run once in the Supabase dashboard after 01_reviews.sql:
-- SQL Editor > New query > paste > Run.

-- Demo rentals. Order numbers and plates are made up; the hackathon dataset may
-- not be published, so none of its real orders or plates are used here.
create table public.rentals (
  id bigint generated always as identity primary key,
  order_no text not null unique,
  plate text not null,
  car_model text not null,
  created_at timestamptz not null default now()
);

-- One row per return attempt.
create table public.return_sessions (
  id uuid primary key default gen_random_uuid(),
  rental_id bigint not null references public.rentals (id),
  status text not null default 'uploading' check (status in ('uploading', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index return_sessions_submitted_at_idx on public.return_sessions (submitted_at desc);

-- One row per required photo. image_type follows iRent's upload codes:
-- 1 left front, 2 right front, 3 left rear, 4 right rear, 10 front interior, 11 rear interior.
create table public.return_photos (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.return_sessions (id) on delete cascade,
  image_type smallint not null check (image_type in (1, 2, 3, 4, 10, 11)),
  storage_path text not null,
  width integer,
  height integer,
  -- In-browser quality check: metrics and the issues it raised.
  quality jsonb not null default '{}',
  verdict text not null check (verdict in ('pass', 'warn')),
  -- How many shots the check rejected before this one was accepted.
  rejected_shots integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, image_type)
);

-- RLS on with no policies: only the server-side secret key can read or write.
alter table public.rentals enable row level security;
alter table public.return_sessions enable row level security;
alter table public.return_photos enable row level security;

-- Private bucket for the photos; uploads go through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-photos', 'return-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

insert into public.rentals (order_no, plate, car_model) values
  ('DEMO-0001', 'ABC-1234', 'Toyota Yaris'),
  ('DEMO-0002', 'XYZ-5678', 'Toyota Corolla Cross'),
  ('DEMO-0003', 'DEF-9012', 'Toyota Prius c');
