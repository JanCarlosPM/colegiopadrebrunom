# Supabase – Módulo de Configuración

## Migración necesaria para Configuración

Para que la página **Configuración** (General, Precios, Usuarios) funcione, ejecuta la migración en tu proyecto de Supabase:

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard), abre tu proyecto.
2. Ve a **SQL Editor**.
3. Copia y pega el contenido del archivo `migrations/001_config_module.sql`.
4. Ejecuta el script (Run).

Eso crea o amplía:

- **school_settings**: columnas para nombre del colegio, dirección, teléfono, email, año lectivo, matrículas abiertas, montos de matrícula (C$ y USD), notificaciones y descuentos.
- **grade_prices**: precios de mensualidad por grado (C$ y USD). Se rellenan por defecto para los grados que ya existan en `grades`.
- **app_users**: tabla de usuarios de la app (nombre, email, rol, activo). El `id` es el mismo que en `auth.users`; los usuarios nuevos se crean desde Configuración (crear usuario = registro en Auth + fila en `app_users`).

### Sincronizar usuarios existentes de Auth (opcional)

Si ya tienes usuarios en Supabase Auth y quieres que aparezcan en la pestaña Usuarios, ejecuta una vez en el SQL Editor (con permisos de servicio o como superusuario):

```sql
INSERT INTO app_users (id, email, full_name, role, is_active)
SELECT id, email, raw_user_meta_data->>'full_name', 'Administrador', true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(app_users.full_name, EXCLUDED.full_name);
```

(Requiere que la tabla `app_users` exista y que `auth.users` sea accesible en tu contexto.)
