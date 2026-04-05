-- Obsoleto: el front solo inserta en public.payments; los triggers actualizan charges.
-- No crear set_charge_paid_state. Si existía en BD (migración antigua), se elimina.

drop function if exists public.set_charge_paid_state(uuid, numeric, text);
