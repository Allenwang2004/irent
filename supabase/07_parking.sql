-- Return ends with "help the next renter find the car": a photo of where the
-- car is parked (required) and an optional description. Requires
-- 04_inspections.sql. Run once in the Supabase dashboard:
-- SQL Editor > New query > paste > Run.

alter table public.inspection_photos drop constraint inspection_photos_category_check;
alter table public.inspection_photos add constraint inspection_photos_category_check
  check (category in ('card', 'angle', 'known_damage', 'extra', 'parking'));

-- e.g. "長安東路150號7-11附近" or "B3-151".
alter table public.inspections add column parking_note text;
