import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  importStudents,
  importEnrollments,
  importMonthlyPayments,
  normalizeHeader,
  type ParsedRow,
  type ValidationIssue,
} from "@/services/importaciones";

type ImportTab = "estudiantes" | "matriculas" | "mensualidades";

const parseCell = (value: unknown) => String(value ?? "").trim();

const requiredByTab: Record<ImportTab, string[]> = {
  estudiantes: ["nombre_estudiante", "nombre_tutor", "telefono_tutor", "grado"],
  matriculas: ["nombre_estudiante", "academic_year", "total_amount", "paid_amount", "currency"],
  mensualidades: ["nombre_estudiante", "academic_year", "month", "amount", "currency"],
};

const templates: Record<ImportTab, ParsedRow[]> = {
  estudiantes: [
    {
      nombre_estudiante: "Juan Carlos Pérez",
      nombre_tutor: "María Gómez",
      telefono_tutor: "88887777",
      grado: "2do Grado",
      seccion: "A",
      estado: "ACTIVO",
    },
  ],
  matriculas: [
    {
      nombre_estudiante: "Juan Carlos Pérez",
      academic_year: String(new Date().getFullYear()),
      total_amount: "300",
      paid_amount: "300",
      currency: "NIO",
      status: "PAGADO",
      enrolled_at: new Date().toISOString(),
    },
  ],
  mensualidades: [
    {
      nombre_estudiante: "Juan Carlos Pérez",
      academic_year: String(new Date().getFullYear()),
      month: "3",
      amount: "770",
      received_amount: "770",
      currency: "NIO",
      paid_at: new Date().toISOString(),
      method: "EFECTIVO",
    },
  ],
};

const readSpreadsheet = async (file: File): Promise<ParsedRow[]> => {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rows.map((row) => {
    const normalized: ParsedRow = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = parseCell(value);
    });
    return normalized;
  });
};

const downloadTemplate = async (tab: ImportTab) => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(templates[tab]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  XLSX.writeFile(wb, `plantilla_importacion_${tab}.xlsx`);
};

export default function Importaciones() {
  const [tab, setTab] = useState<ImportTab>("estudiantes");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);
  const [simulationOnly, setSimulationOnly] = useState(
    import.meta.env.VITE_IMPORT_SIMULATION_DEFAULT === "true"
  );

  const requiredFields = useMemo(() => requiredByTab[tab], [tab]);
  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  const validateRows = (candidateRows: ParsedRow[]) => {
    const nextIssues: ValidationIssue[] = [];
    candidateRows.forEach((row, idx) => {
      const missing = requiredFields.filter((field) => !String(row[field] || "").trim());
      if (missing.length > 0) {
        nextIssues.push({
          row: idx + 2,
          message: `Faltan campos obligatorios: ${missing.join(", ")}`,
        });
      }
    });
    return nextIssues;
  };

  const resetState = () => {
    setRows([]);
    setIssues([]);
    setResult(null);
  };

  const onTabChange = (value: string) => {
    setTab(value as ImportTab);
    resetState();
  };

  const onPickFile = async (picked: File | null) => {
    resetState();
    if (!picked) return;

    try {
      const parsed = await readSpreadsheet(picked);
      if (parsed.length === 0) {
        toast.error("El archivo no tiene filas para importar.");
        return;
      }
      setRows(parsed);
      const validationIssues = validateRows(parsed);
      setIssues(validationIssues);
      if (validationIssues.length > 0) {
        toast.warning(`Se detectaron ${validationIssues.length} filas con faltantes.`);
      } else {
        toast.success(`Archivo cargado: ${parsed.length} filas listas para importar.`);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo leer el archivo. Verifica que sea .xlsx o .csv válido.");
    }
  };

  const runImport = async () => {
    if (rows.length === 0) {
      toast.error("Carga primero un archivo con datos.");
      return;
    }
    setRunning(true);
    const dryRun = simulationOnly;
    try {
      let importResult: { processed: number; issues: ValidationIssue[] };
      if (tab === "estudiantes") {
        importResult = await importStudents(rows, { dryRun });
      } else if (tab === "matriculas") {
        importResult = await importEnrollments(rows, { dryRun });
      } else {
        importResult = await importMonthlyPayments(rows, { dryRun });
      }

      const mergedIssues = [...issues, ...importResult.issues];
      setIssues(mergedIssues);
      setResult({
        processed: importResult.processed,
        failed: mergedIssues.length,
      });

      if (dryRun) {
        toast.message("Simulación completada (no se escribió en la base de datos).", {
          description: `${importResult.processed} filas habrían sido procesadas.`,
        });
      } else if (importResult.processed > 0) {
        toast.success(`Importación completada: ${importResult.processed} filas procesadas.`);
      }
      if (mergedIssues.length > 0) {
        toast.warning(`Se encontraron ${mergedIssues.length} observaciones/rechazos.`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Falló la importación. Revisa el archivo e inténtalo de nuevo.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout
      title="Importaciones"
      subtitle="Carga masiva de estudiantes, matrículas y pagos mensuales"
    >
      <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
          <TabsTrigger value="matriculas">Matrículas</TabsTrigger>
          <TabsTrigger value="mensualidades">Pagos Mensuales</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Importación por archivo</CardTitle>
              <CardDescription>
                Descarga la plantilla, llena los datos y sube el archivo en formato Excel o CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void downloadTemplate(tab)}>
                  <Download className="h-4 w-4 mr-2" aria-hidden />
                  Descargar plantilla
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/20 px-4 py-3">
                <div className="space-y-1">
                  <Label htmlFor="import-simulation" className="text-sm font-medium">
                    Solo simular (validar sin guardar)
                  </Label>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Ejecuta la misma lógica de importación pero sin insertar ni actualizar datos en
                    Supabase. Útil para probar archivos grandes o detectar homónimos.
                  </p>
                </div>
                <Switch
                  id="import-simulation"
                  checked={simulationOnly}
                  onCheckedChange={setSimulationOnly}
                  aria-describedby="import-simulation-hint"
                />
                <span id="import-simulation-hint" className="sr-only">
                  Activa o desactiva el modo simulación de importación
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-file">Archivo</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    void onPickFile(picked);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Campos obligatorios: {requiredFields.join(", ")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void runImport()}
                  disabled={running || rows.length === 0}
                  aria-busy={running}
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden />
                  {running
                    ? simulationOnly
                      ? "Simulando..."
                      : "Importando..."
                    : simulationOnly
                      ? "Ejecutar simulación"
                      : "Ejecutar importación"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetState}>
                  Limpiar vista
                </Button>
              </div>

              {result && (
                <div
                  className="rounded-md border p-3 text-sm bg-muted/20"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                    <span>
                      {simulationOnly ? "Simuladas (válidas)" : "Procesadas"}: {result.processed}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
                    <span>Con observaciones/rechazos: {result.failed}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Vista previa</CardTitle>
          <CardDescription>
            Se muestran las primeras 10 filas detectadas en el archivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {previewRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos cargados.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {Object.keys(previewRows[0] ?? {}).map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={`${idx}-${row.nombre_estudiante ?? "fila"}`}>
                      <TableCell>{idx + 2}</TableCell>
                      {Object.keys(previewRows[0] ?? {}).map((header) => (
                        <TableCell key={`${header}-${idx}`}>{row[header] || "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
          <CardDescription>Filas rechazadas o con datos incompletos.</CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin observaciones por ahora.</p>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 50).map((issue, idx) => (
                <p key={`${issue.row}-${idx}`} className="text-sm">
                  <span className="font-medium">Fila {issue.row}:</span> {issue.message}
                </p>
              ))}
              {issues.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 50 observaciones de {issues.length}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
