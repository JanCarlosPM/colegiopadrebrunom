-- Verificación rápida del módulo Otros Cobros

-- 1) Tablas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('payment_items', 'other_payments')
order by table_name;

-- 2) Columnas de auditoría
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'payment_items' and column_name in ('created_by', 'updated_by'))
    or
    (table_name = 'other_payments' and column_name in ('created_by'))
  )
order by table_name, column_name;

-- 3) Políticas activas
select tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('payment_items', 'other_payments')
order by tablename, policyname;

-- 4) Conteos básicos
select
  (select count(*) from public.payment_items) as total_conceptos,
  (select count(*) from public.other_payments) as total_cobros_especiales;
