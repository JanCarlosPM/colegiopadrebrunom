-- Fix para trigger global de recibos:
-- Evita error "query has no destination for result data" en PL/pgSQL.

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
