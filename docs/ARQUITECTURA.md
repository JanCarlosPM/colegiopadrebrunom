# Arquitectura del frontend (Colegio Padre Bruno)

## Stack

- **Vite + React 18 + TypeScript**
- **React Router** (rutas públicas: login, reset password; resto protegidas)
- **TanStack Query v5** — caché de servidor, reintentos y manejo de JWT expirado
- **Supabase** — Auth + PostgREST
- **Tailwind + shadcn/ui** — UI

## Organización del código

| Carpeta | Rol |
|--------|-----|
| `src/pages/` | Pantallas conectadas a rutas (lazy-loaded desde `App.tsx`) |
| `src/components/layout/` | `DashboardLayout`, `Sidebar`, `ProtectedRoute` |
| `src/components/ui/` | Primitivos shadcn |
| `src/components/common/` | Piezas reutilizables de dominio (badges, form fields) |
| `src/lib/` | Utilidades (`billing`, `supabase`, `queryClient`, `queryKeys`, validaciones) |
| `src/services/` | Lógica de negocio más pesada o reutilizable (p. ej. importaciones masivas) |
| `src/hooks/` | Flujos compuestos (matrícula, pagos) |
| `supabase/migrations/` | SQL versionado (módulos nuevos, endurecimiento) |

## React Query

- **Cliente global**: `createAppQueryClient()` en `src/lib/queryClient.ts`
  - `staleTime` 60s, `gcTime` 5 min, `refetchOnWindowFocus: false`
  - Reintentos acotados; sin reintento si el error es JWT expirado
- **Claves**: `src/lib/queryKeys.ts` — conviene usar `queryKeys.*` en nuevas queries
- **Tras mutaciones financieras**: `invalidateFinancialViews(qc, { year })` para alinear Dashboard, Historial reciente, Reportes, listados de estudiantes y pagos/matrículas del año

## Importaciones masivas

- Implementación en `src/services/importaciones.ts` (menos consultas N+1 que la versión fila-a-fila)
- **Modo simulación**: no escribe en Supabase; valida y cuenta filas procesables. Activar con el interruptor en la UI o `VITE_IMPORT_SIMULATION_DEFAULT=true` en `.env`
- **Homónimos**: si hay varios estudiantes con el mismo nombre normalizado, la importación de matrículas/mensualidades rechaza la fila con mensaje explícito (antes `maybeSingle` podía fallar de forma poco clara)

## Rendimiento percibido

- Rutas principales cargan con `React.lazy` + `Suspense`
- El sidebar precarga el chunk de la página al **hover/focus** del enlace (`prefetchRouteModule`)

## Seguridad y datos

- **RLS** y políticas viven en Supabase (no en el repo completo). El anon key solo debe usarse con RLS correcta
- Tras caducidad de JWT, las queries/mutations disparan cierre de sesión y redirección a `/login`

## TypeScript

- **App completa**: `npm run typecheck` → `tsc -p tsconfig.app.json` (modo permisivo heredado en `tsconfig.app.json`).
- **Núcleo estricto** (`src/lib`, `src/services`, `src/hooks`, `src/types`): `npm run typecheck:strict` → `tsconfig.core.json` con `strict`, `strictNullChecks` y `noImplicitAny`. Ampliar carpetas allí cuando estabilicemos más módulos.

## Tipos de Supabase

- Cliente en `src/lib/supabase.ts`: `createClient<Database>(...)`.
- Definición actual: `src/types/database.types.ts` (mantenida a mano si no hay CLI enlazado).
- **Regenerar desde la nube** (proyecto enlazado o `SUPABASE_PROJECT_ID`):

  ```bash
  npm run db:types
  ```

  Requiere `npx supabase link` o variable de entorno `SUPABASE_PROJECT_ID`. Con Docker local: `npx supabase gen types typescript --local`.

## Próximos pasos recomendados

1. Ampliar `tsconfig.core.json` → incluir `src/components/common` o páginas concretas al ir corrigiendo tipos.
2. Tests de integración ligados a contratos de API (mock de Supabase).
3. Virtualización en tablas muy largas (`@tanstack/react-virtual`) si el volumen lo exige.
