-- Casts explícitos a public.charge_status / public.payment_concept en la función
-- que genera mensualidades al matricular. Evita:
--   "column status is of type charge_status but expression is of type text"
-- (p. ej. comparaciones WHERE status = 'PENDIENTE' o CASE sin cast en PL/pgSQL).
--
-- Nota: no recreamos el trigger aquí; debe seguir apuntando a esta función.

create unique index if not exists uq_charges_student_year_concept_month
  on public.charges (student_id, academic_year, concept, month);

create or replace function public.generate_monthly_charges_on_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_grade_id uuid;
  v_amount_nio numeric := 770;
  v_amount_usd numeric := 21;
  v_currency text := 'NIO';
  v_amount numeric;
begin
  select s.grade_id
  into v_grade_id
  from public.students s
  where s.id = new.student_id;

  if v_grade_id is not null then
    select
      coalesce(gp.monthly_amount, 770),
      coalesce(gp.monthly_amount_usd, 21),
      coalesce(nullif(trim(gp.currency), ''), 'NIO')
    into v_amount_nio, v_amount_usd, v_currency
    from public.grade_prices gp
    where gp.grade_id = v_grade_id
    limit 1;
  end if;

  v_amount := case
    when upper(v_currency) = 'USD' then coalesce(v_amount_usd, 21)
    else coalesce(v_amount_nio, 770)
  end;

  insert into public.charges (
    student_id,
    academic_year,
    grade_id,
    concept,
    month,
    due_date,
    amount,
    currency,
    status,
    paid_amount
  )
  select
    new.student_id,
    new.academic_year,
    v_grade_id,
    'MENSUALIDAD'::public.payment_concept,
    m::integer,
    make_date(new.academic_year, m::integer, 10),
    v_amount,
    upper(v_currency),
    'PENDIENTE'::public.charge_status,
    0
  from generate_series(1, 12) as month_row(m)
  on conflict (student_id, academic_year, concept, month)
  do update set
    grade_id = excluded.grade_id,
    amount = excluded.amount,
    currency = excluded.currency,
    due_date = excluded.due_date
  where coalesce(public.charges.paid_amount, 0) = 0
    and public.charges.status = 'PENDIENTE'::public.charge_status;

  return new;
end;
$$;

-- Patrón para triggers / funciones que actualicen cargos tras un pago (revisar en SQL Editor
-- si el nombre de tu función difiere). Sustituí asignaciones a status por:
--
--   status = case
--     when ... then 'PAGADO'::public.charge_status
--     when ... then 'PARCIAL'::public.charge_status
--     else 'PENDIENTE'::public.charge_status
--   end
--
-- y en INSERT de charges: status => 'PENDIENTE'::public.charge_status
