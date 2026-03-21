# Tipos de base de datos (Supabase)

## Estado actual

- `src/types/database.types.ts` define `Database` para el cliente tipado.
- Si tu esquema en Supabase difiere (columnas nuevas, tablas extra), actualiza el archivo o regenera con el CLI.

## Regenerar con Supabase CLI

1. Instala/uso: `npx supabase` (no hace falta instalar global).
2. En la raíz del repositorio:
   - **Opción A:** `npx supabase link` (te pedirá proyecto y credenciales).
   - **Opción B:** define `SUPABASE_PROJECT_ID` con el ID del proyecto (Dashboard → Settings → General).
3. Ejecuta:

   ```bash
   npm run db:types
   ```

   El script escribe `src/types/database.types.ts` con la salida oficial del CLI.

## Local con Docker

Si usas `supabase start` y Docker:

```bash
npx supabase gen types typescript --local
```

Puedes redirigir la salida al mismo path que usa `npm run db:types` o ajustar `scripts/gen-supabase-types.mjs`.

## Tras regenerar

- Ejecuta `npm run typecheck` y corrige inserciones/selects que ya no coincidan con el esquema.
- El helper `Tables<"nombre_tabla">` (en `database.types.ts`) sigue disponible si lo mantiene la plantilla generada.
