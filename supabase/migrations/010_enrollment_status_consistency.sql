-- Asegura consistencia de enrollments.status con total_amount/paid_amount.
-- Regla:
--   PAGADO   => paid_amount >= total_amount
--   PARCIAL  => paid_amount > 0 y paid_amount < total_amount
--   PENDIENTE=> paid_amount = 0

create or replace function public.sync_enrollment_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_amount := coalesce(new.total_amount, 0);
  new.paid_amount := coalesce(new.paid_amount, 0);

  if new.paid_amount <= 0 then
    new.status := 'PENDIENTE';
  elsif new.paid_amount + 0.0001 >= new.total_amount then
    new.status := 'PAGADO';
  else
    new.status := 'PARCIAL';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_enrollment_status on public.enrollments;

create trigger trg_sync_enrollment_status
before insert or update of total_amount, paid_amount
on public.enrollments
for each row
execute function public.sync_enrollment_status();

-- Corrección de datos existentes.
update public.enrollments
set status = case
  when coalesce(paid_amount, 0) <= 0 then 'PENDIENTE'
  when coalesce(paid_amount, 0) + 0.0001 >= coalesce(total_amount, 0) then 'PAGADO'
  else 'PARCIAL'
end;

