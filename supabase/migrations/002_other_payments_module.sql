-- Módulo de otros cobros (graduación, promoción, libros, uniforme, etc.)
-- Ejecutar este script en Supabase SQL Editor.

create table if not exists public.payment_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'OTROS' check (category in ('PROMOCION', 'GRADUACION', 'LIBROS', 'UNIFORME', 'OTROS')),
  default_amount numeric not null default 0,
  currency text not null default 'NIO' check (currency in ('NIO', 'USD')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.other_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  item_id uuid references public.payment_items(id) on delete set null,
  item_name text not null,
  amount numeric not null default 0,
  received_amount numeric not null default 0,
  change_amount numeric not null default 0,
  currency text not null default 'NIO' check (currency in ('NIO', 'USD')),
  status text not null default 'COMPLETADO' check (status in ('COMPLETADO', 'PARCIAL')),
  payment_date timestamptz not null default now(),
  academic_year int not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_items_active on public.payment_items(is_active);
create unique index if not exists uq_payment_items_name on public.payment_items(name);
create index if not exists idx_other_payments_year on public.other_payments(academic_year);
create index if not exists idx_other_payments_student on public.other_payments(student_id);

alter table public.payment_items enable row level security;
alter table public.other_payments enable row level security;

drop policy if exists "payment_items_select" on public.payment_items;
create policy "payment_items_select"
  on public.payment_items
  for select
  to authenticated
  using (true);

drop policy if exists "payment_items_write" on public.payment_items;
create policy "payment_items_write"
  on public.payment_items
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "other_payments_select" on public.other_payments;
create policy "other_payments_select"
  on public.other_payments
  for select
  to authenticated
  using (true);

drop policy if exists "other_payments_write" on public.other_payments;
create policy "other_payments_write"
  on public.other_payments
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.payment_items (name, category, default_amount, currency)
values
  ('Toga Preescolar', 'GRADUACION', 350, 'NIO'),
  ('Paquete Graduación Primaria', 'GRADUACION', 600, 'NIO'),
  ('Paquete Graduación Secundaria', 'GRADUACION', 900, 'NIO'),
  ('Libros Primaria', 'LIBROS', 1200, 'NIO'),
  ('Libros Secundaria', 'LIBROS', 1600, 'NIO')
on conflict (name) do nothing;
