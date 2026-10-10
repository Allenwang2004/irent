-- Work orders that follow from alerts, and pausing a car until it is fixed.
-- Requires 04_inspections.sql. Run once in the Supabase dashboard:
-- SQL Editor > New query > paste > Run.
--
-- Everything here runs inside the database, so the lab-server worker does not
-- change: it keeps inserting alerts, and triggers turn them into work orders.

-- 'maintenance': registered but paused (being cleaned or repaired); not offered for pickup.
alter table public.vehicles drop constraint vehicles_status_check;
alter table public.vehicles add constraint vehicles_status_check
  check (status in ('registering', 'available', 'in_use', 'maintenance', 'retired'));

create table public.work_orders (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.vehicles (id) on delete cascade,
  inspection_id uuid references public.inspections (id) on delete cascade,
  -- Re-analysing an inspection replaces its open alerts; their work orders go with them.
  alert_id bigint references public.alerts (id) on delete cascade,
  kind text not null check (kind in ('cleaning', 'repair', 'contact_renter')),
  -- While any open order blocks rental, the car stays in 'maintenance'.
  blocks_rental boolean not null,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index work_orders_open_idx on public.work_orders (vehicle_id) where status = 'open';
alter table public.work_orders enable row level security;

-- Put a car into maintenance while it has open blocking orders, and back to
-- available once they are all closed. Cars in use, registering or retired are
-- left alone; a returned car is re-checked when its return is submitted.
create function public.refresh_vehicle_block(p_vehicle_id bigint) returns void
language sql
as $$
  update public.vehicles v
  set status = case
        when exists (
          select 1 from public.work_orders w
          where w.vehicle_id = v.id and w.status = 'open' and w.blocks_rental
        ) then 'maintenance'
        else 'available'
      end,
      updated_at = now()
  where v.id = p_vehicle_id
    and v.status in ('available', 'maintenance');
$$;

revoke execute on function public.refresh_vehicle_block(bigint) from public, anon, authenticated;
grant execute on function public.refresh_vehicle_block(bigint) to service_role;

-- Alert -> work order:
--   dirty                    cleaning, blocks rental
--   new_damage (high)        repair, blocks rental
--   card_missing, left_item  contact the renter, does not block
create function public.alerts_create_work_order() returns trigger
language plpgsql
as $$
begin
  if new.status <> 'open' then
    return new;
  end if;
  if new.kind = 'dirty' then
    insert into public.work_orders (vehicle_id, inspection_id, alert_id, kind, blocks_rental)
    values (new.vehicle_id, new.inspection_id, new.id, 'cleaning', true);
  elsif new.kind = 'new_damage' and new.severity = 'high' then
    insert into public.work_orders (vehicle_id, inspection_id, alert_id, kind, blocks_rental)
    values (new.vehicle_id, new.inspection_id, new.id, 'repair', true);
  elsif new.kind in ('card_missing', 'left_item') then
    insert into public.work_orders (vehicle_id, inspection_id, alert_id, kind, blocks_rental)
    values (new.vehicle_id, new.inspection_id, new.id, 'contact_renter', false);
  end if;
  return new;
end;
$$;

create trigger alerts_create_work_order
after insert on public.alerts
for each row execute function public.alerts_create_work_order();

-- Any change to work orders re-evaluates whether the car is paused.
create function public.work_orders_refresh_vehicle() returns trigger
language plpgsql
as $$
begin
  perform public.refresh_vehicle_block(coalesce(new.vehicle_id, old.vehicle_id));
  return null;
end;
$$;

create trigger work_orders_refresh_vehicle
after insert or update or delete on public.work_orders
for each row execute function public.work_orders_refresh_vehicle();
