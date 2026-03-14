# Cierre a Producción - Checklist

## 1) Base de datos (obligatorio)

- Ejecutar en Supabase SQL Editor, en este orden:
  - `supabase/migrations/002_other_payments_module.sql`
  - `supabase/migrations/003_other_payments_hardening.sql`
- Ejecutar `supabase/sql/verify_other_payments_setup.sql` y confirmar:
  - tablas creadas,
  - políticas activas,
  - columnas de auditoría presentes.

## 2) Pruebas críticas (manuales)

- Matrícula:
  - Estudiante nuevo: registra matrícula, genera recibo, genera mensualidades.
  - Estudiante ya matriculado: muestra aviso correcto y estado de saldo.
- Mensualidades:
  - Pago exacto, pago parcial y pago con cambio.
  - Validación de `Recibido`: C$ hasta 4 cifras, USD hasta 3 cifras.
- Otros Cobros:
  - Admin crea concepto.
  - Cobrador no puede crear concepto (sí puede cobrar).
  - Registrar pago completo y parcial.
- Reportes:
  - Exportar PDF y Excel.
  - Validar que la exportación no bloquee la UI.

## 3) Seguridad y permisos

- Confirmar que solo `Administrador` crea/edita/elimina conceptos de `payment_items`.
- Confirmar que usuario inactivo no opera (según reglas de `app_users`).

## 4) Auditoría

- Verificar que `payment_items.created_by/updated_by` se llenen.
- Verificar que `other_payments.created_by` se llene al insertar cobros.

## 5) Verificación técnica final

- `npm run lint`
- `npm run build`
- Smoke test de rutas:
  - `/matriculas`
  - `/pagos`
  - `/otros-cobros`
  - `/reportes`
  - `/configuracion`

## 6) Go-live

- Respaldar DB (snapshot).
- Publicar build.
- Monitorear primeras 24h:
  - errores de login,
  - errores de inserción de pagos,
  - tiempos de carga en reportes.
