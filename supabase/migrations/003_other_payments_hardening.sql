-- Endurecimiento del módulo Otros Cobros:
-- - Auditoría (created_by/updated_by)
-- - Políticas por rol para catálogo de conceptos

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'payment_items'
  ) then
    alter table public.payment_items
      add column if not exists created_by uuid references auth.users(id),
      add column if not exists updated_by uuid references auth.users(id);

    update public.payment_items
      set created_by = coalesce(created_by, auth.uid()),
          updated_by = coalesce(updated_by, auth.uid());

    alter table public.payment_items
      alter column created_by set default auth.uid(),
      alter column updated_by set default auth.uid();
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'other_payments'
  ) then
    alter table public.other_payments
      add column if not exists created_by uuid references auth.users(id);

    update public.other_payments
      set created_by = coalesce(created_by, auth.uid());

    alter table public.other_payments
      alter column created_by set default auth.uid();
  end if;
end $$;

-- Políticas más finas para payment_items
drop policy if exists "payment_items_write" on public.payment_items;

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
        and au.role = 'Administrador'
    )
  );

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
        and au.role = 'Administrador'
    )
  )
  with check (
    exists (
      select 1
      from public.app_users au
      where au.id = auth.uid()
        and au.is_active = true
        and au.role = 'Administrador'
    )
  );

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
        and au.role = 'Administrador'
    )
  );
