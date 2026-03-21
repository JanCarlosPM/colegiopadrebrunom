/**
 * Regenera src/types/database.types.ts usando Supabase CLI.
 *
 * Requisitos:
 *   - CLI: npx supabase (o supabase en PATH)
 *   - Proyecto enlazado: `npx supabase link` en la raíz del repo, o
 *   - Variable SUPABASE_PROJECT_ID con el ref del proyecto
 *
 * Uso:
 *   npm run db:types
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outFile = join(root, "src", "types", "database.types.ts");

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();
const args = projectId
  ? ["gen", "types", "typescript", "--project-id", projectId]
  : ["gen", "types", "typescript", "--linked"];

try {
  const stdout = execSync(`npx supabase ${args.join(" ")}`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env },
  });

  const banner = `/**
 * Generado por Supabase CLI. No editar a mano; ejecuta \`npm run db:types\`.
 * ${new Date().toISOString()}
 */

`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, banner + stdout, "utf8");
  console.log("Escrito:", outFile);
} catch (e) {
  console.error(
    "\nNo se pudieron generar los tipos. Opciones:\n" +
      "  1) En la raíz del repo: npx supabase link\n" +
      "  2) O exporta SUPABASE_PROJECT_ID y vuelve a ejecutar npm run db:types\n" +
      "  3) O con Docker: npx supabase gen types typescript --local > src/types/database.types.ts\n"
  );
  process.exit(1);
}
