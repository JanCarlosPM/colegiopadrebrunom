-- Numeración global de recibos para matrículas, mensualidades y otros cobros.
-- Reglas:
-- 1) receipt_number obligatorio en payments y other_payments
-- 2) no se permite duplicado entre ambas tablas
-- 3) el consecutivo global se actualiza con el número usado (editable por usuario)
-- 4) configuración editable del último número base

create table if not exists public.receipt_sequence_settings (
  id int primary key check (id = 1),
  last_number bigint not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.receipt_sequence_settings enable row level security;

drop policy if exists "receipt_sequence_select" on public.receipt_sequence_settings;
create policy "receipt_sequence_select"
  on public.receipt_sequence_settings
  for select
  to authenticated
  using (true);

drop policy if exists "receipt_sequence_write" on public.receipt_sequence_settings;
create policy "receipt_sequence_write"
  on public.receipt_sequence_settings
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.receipt_sequence_settings (id, last_number)
select
  1,
  coalesce(max(v.num), 0)::bigint
from (
  select nullif(regexp_replace(coalesce(p.receipt_number, ''), '\D', '', 'g'), '')::bigint as num
  from public.payments p
  where coalesce(trim(p.receipt_number), '') <> ''
  union all
  select nullif(regexp_replace(coalesce(op.receipt_number, ''), '\D', '', 'g'), '')::bigint as num
  from public.other_payments op
  where coalesce(trim(op.receipt_number), '') <> ''
) v
on conflict (id) do nothing;

create or replace function public.validate_and_track_global_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt text;
  v_receipt_num bigint;
begin
  insert into public.receipt_sequence_settings (id, last_number)
  values (1, 0)
  on conflict (id) do nothing;

  perform 1
  from public.receipt_sequence_settings
  where id = 1
  for update;

  v_receipt := trim(coalesce(new.receipt_number, ''));
  if v_receipt = '' then
    raise exception 'RECEIPT_REQUIRED';
  end if;

  if v_receipt !~ '^[0-9]+$' then
    raise exception 'RECEIPT_NOT_NUMERIC';
  end if;

  if exists (
    select 1
    from public.payments p
    where trim(coalesce(p.receipt_number, '')) = v_receipt
  ) or exists (
    select 1
    from public.other_payments op
    where trim(coalesce(op.receipt_number, '')) = v_receipt
  ) then
    raise exception 'RECEIPT_DUPLICATE:%', v_receipt;
  end if;

  v_receipt_num := v_receipt::bigint;

  update public.receipt_sequence_settings
  set
    last_number = v_receipt_num,
    updated_at = now()
  where id = 1;

  new.receipt_number := v_receipt;
  return new;
end;
$$;

drop trigger if exists trg_validate_global_receipt_payments on public.payments;
create trigger trg_validate_global_receipt_payments
before insert
on public.payments
for each row
execute function public.validate_and_track_global_receipt_number();

drop trigger if exists trg_validate_global_receipt_other_payments on public.other_payments;
create trigger trg_validate_global_receipt_other_payments
before insert
on public.other_payments
for each row
execute function public.validate_and_track_global_receipt_number();
