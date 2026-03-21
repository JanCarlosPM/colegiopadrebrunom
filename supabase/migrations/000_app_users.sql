-- Tabla de usuarios de la aplicación (roles: administrador / cobrador).
-- Ejecuta ESTE archivo ANTES que 003 / 004 si ves: relation "app_users" does not exist.
-- Después, crea tu primera fila de administrador (sustituye id y email por tu usuario de Auth):

/*
insert into public.app_users (id, email, full_name, role, is_active)
values (
  'UUID-DEL-USUARIO-EN-AUTH-USERS',
  'tu@correo.com',
  'Tu nombre',
  'Administrador',
  true
);
*/

create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_app_users_email on public.app_users (email);

alter table public.app_users enable row level security;

-- Política amplia: cualquier usuario autenticado puede leer/escribir (colegio cerrado).
-- Si quieres restringir más, sustituye por políticas por rol.
drop policy if exists "app_users_authenticated_all" on public.app_users;
create policy "app_users_authenticated_all"
  on public.app_users
  for all
  to authenticated
  using (true)
  with check (true);
