-- Idempotente: bases que ya ejecutaron la versión anterior de 007 que creaba la RPC.
drop function if exists public.set_charge_paid_state(uuid, numeric, text);
