-- 1) Quitar trigger que pisaba status (marcaba PAGADO aunque el pago fuera parcial).
-- 2) Mantener una sola fuente de verdad: apply_payment_to_charge() con casts a charge_status.
--
-- Si tu trigger de sync tenía otro nombre o estaba en otra tabla, ajustá antes de aplicar.

drop trigger if exists trg_sync_charge_status on public.payments;

drop function if exists public.fn_sync_charge_status() cascade;

-- Reemplaza el cuerpo del trigger de pagos: acumula en la moneda del cargo y calcula PENDIENTE/PARCIAL/PAGADO.
create or replace function public.apply_payment_to_charge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge record;
  v_student_grade_id uuid;
  v_eff_grade_id uuid;
  v_monthly_nio numeric;
  v_monthly_usd numeric;
  v_rate numeric;
  v_applied numeric;
  v_new_paid numeric;
  v_status public.charge_status;
  v_charge_cur text;
  v_pay_cur text;
begin
  if new.charge_id is null then
    return new;
  end if;

  if new.status is distinct from 'COMPLETADO'::public.payment_status then
    return new;
  end if;

  select
    c.id,
    c.student_id,
    c.amount,
    c.paid_amount,
    c.currency,
    c.grade_id
  into v_charge
  from public.charges c
  where c.id = new.charge_id
  for update;

  if not found then
    return new;
  end if;

  select s.grade_id
  into v_student_grade_id
  from public.students s
  where s.id = v_charge.student_id;

  v_eff_grade_id := coalesce(v_charge.grade_id, v_student_grade_id);

  select
    coalesce(gp.monthly_amount, 770::numeric),
    coalesce(gp.monthly_amount_usd, 21::numeric)
  into v_monthly_nio, v_monthly_usd
  from public.grade_prices gp
  where gp.grade_id = v_eff_grade_id
  limit 1;

  if v_monthly_usd is null or v_monthly_usd = 0 then
    v_rate := 36.5::numeric;
  else
    v_rate := v_monthly_nio / v_monthly_usd;
  end if;

  v_charge_cur := upper(trim(coalesce(v_charge.currency, 'NIO')));
  v_pay_cur := upper(trim(coalesce(new.currency, 'NIO')));

  if v_charge_cur = v_pay_cur then
    v_applied := coalesce(new.amount, 0);
  elsif v_charge_cur = 'USD' and v_pay_cur = 'NIO' then
    v_applied := coalesce(new.amount, 0) / v_rate;
  elsif v_charge_cur = 'NIO' and v_pay_cur = 'USD' then
    v_applied := coalesce(new.amount, 0) * v_rate;
  else
    v_applied := coalesce(new.amount, 0);
  end if;

  v_new_paid := round(coalesce(v_charge.paid_amount, 0) + v_applied, 2);

  if v_new_paid + 0.0001 >= coalesce(v_charge.amount, 0) then
    v_status := 'PAGADO'::public.charge_status;
  elsif v_new_paid > 0.0001 then
    v_status := 'PARCIAL'::public.charge_status;
  else
    v_status := 'PENDIENTE'::public.charge_status;
  end if;

  update public.charges
  set
    paid_amount = v_new_paid,
    status = v_status
  where id = new.charge_id;

  return new;
end;
$$;

comment on function public.apply_payment_to_charge() is
  'AFTER INSERT en payments: acumula paid_amount del cargo (con conversión vía grade_prices) y status con enum charge_status.';

-- Debe existir exactamente un trigger AFTER INSERT en payments que invoque solo esta función.
-- Si aún no lo tenés, o querés unificar el nombre (y evitar duplicados con otro trigger), ejecutá:
--
-- drop trigger if exists trg_apply_payment_to_charge on public.payments;
-- create trigger trg_apply_payment_to_charge
--   after insert on public.payments
--   for each row execute function public.apply_payment_to_charge();
--
-- En PostgreSQL 11–13 reemplazá la última línea por:
--   for each row execute procedure public.apply_payment_to_charge();
