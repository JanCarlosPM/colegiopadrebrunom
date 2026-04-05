-- PostgREST puede enviar valores JSON como text al hacer PATCH en columnas enum,
-- lo que dispara: 42804 column "status" is of type charge_status but expression is of type text.
-- Esta RPC fuerza el cast en el servidor.

create or replace function public.set_charge_paid_state(
  p_charge_id uuid,
  p_paid_amount numeric,
  p_status text
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_status is null
     or trim(p_status) = ''
     or trim(p_status) not in ('PENDIENTE', 'PARCIAL', 'PAGADO') then
    raise exception 'INVALID_CHARGE_STATUS' using errcode = 'P0001';
  end if;

  update public.charges
  set
    paid_amount = p_paid_amount,
    status = trim(p_status)::public.charge_status
  where id = p_charge_id;

  if not found then
    raise exception 'CHARGE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.set_charge_paid_state(uuid, numeric, text) is
  'Actualiza paid_amount y status de charges con cast explícito a charge_status (cliente vía supabase.rpc).';

grant execute on function public.set_charge_paid_state(uuid, numeric, text) to authenticated;
grant execute on function public.set_charge_paid_state(uuid, numeric, text) to service_role;
