-- Return flow: interior photos before the doors lock, exterior after.
-- Requires 04_inspections.sql. Run once in the Supabase dashboard:
-- SQL Editor > New query > paste > Run.
--
-- Billing stops when the renter taps Return, which is the return inspection's
-- started_at. They then have 5 minutes to photograph the interior, get out and
-- lock the doors; otherwise the return is cancelled and billing carries on.
-- Once locked the doors cannot be reopened, so interior photos are final.

alter table public.inspections add column locked_at timestamptz;
