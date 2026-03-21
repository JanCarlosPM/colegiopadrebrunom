-- Alinea RLS con el cliente: rol administrador sin depender de mayúsculas exactas.

drop policy if exists "payment_items_insert_admin" on public.payment_items;
create policy "payment_items_insert_admin"
  on public.payment_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.app_users au
      where au.id = auth.uid()
        and au.is_active = true
        and lower(trim(au.role)) = 'administrador'
    )
  );

drop policy if exists "payment_items_update_admin" on public.payment_items;
create policy "payment_items_update_admin"
  on public.payment_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.app_users au
      where au.id = auth.uid()
        and au.is_active = true
        and lower(trim(au.role)) = 'administrador'
    )
  )
  with check (
    exists (
      select 1
      from public.app_users au
      where au.id = auth.uid()
        and au.is_active = true
        and lower(trim(au.role)) = 'administrador'
    )
  );

drop policy if exists "payment_items_delete_admin" on public.payment_items;
create policy "payment_items_delete_admin"
  on public.payment_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.app_users au
      where au.id = auth.uid()
        and au.is_active = true
        and lower(trim(au.role)) = 'administrador'
    )
  );
