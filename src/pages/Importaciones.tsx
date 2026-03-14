import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type ImportTab = "estudiantes" | "matriculas" | "mensualidades";

type ParsedRow = Record<string, string>;

type ValidationIssue = {
  row: number;
  message: string;
};

const normalizeHeader = (header: string) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

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

async function importStudents(rows: ParsedRow[]) {
  const issues: ValidationIssue[] = [];
  let processed = 0;

  const { data: grades, error: gradesErr } = await supabase
    .from("grades")
    .select("id,name");
  if (gradesErr) throw gradesErr;
  const gradesByName = new Map(
    (grades ?? []).map((g) => [normalizeHeader(String(g.name)), String(g.id)])
  );

  const { data: allSections, error: sectionsErr } = await supabase
    .from("sections")
    .select("id,name,grade_id");
  if (sectionsErr) throw sectionsErr;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const tutorName = row.nombre_tutor;
    const tutorPhone = String(row.telefono_tutor || "").replace(/\D/g, "").slice(0, 8);
    const gradeName = row.grado;
    const sectionName = row.seccion;
    const status = row.estado === "INACTIVO" ? "INACTIVO" : "ACTIVO";

    if (!studentName || !tutorName || !tutorPhone || !gradeName) {
      issues.push({ row: rowNum, message: "Faltan campos obligatorios en estudiantes." });
      continue;
    }

    const gradeId = gradesByName.get(normalizeHeader(gradeName));
    if (!gradeId) {
      issues.push({ row: rowNum, message: `Grado no encontrado: ${gradeName}` });
      continue;
    }

    let sectionId: string | null = null;
    if (sectionName) {
      const section = (allSections ?? []).find(
        (s) =>
          String(s.grade_id) === gradeId &&
          normalizeHeader(String(s.name)) === normalizeHeader(sectionName)
      );
      if (!section) {
        issues.push({ row: rowNum, message: `Sección no encontrada: ${sectionName}` });
        continue;
      }
      sectionId = String(section.id);
    }

    const { data: existingGuardian, error: guardianSearchErr } = await supabase
      .from("guardians")
      .select("id,full_name,phone")
      .eq("full_name", tutorName)
      .eq("phone", tutorPhone)
      .maybeSingle();
    if (guardianSearchErr) throw guardianSearchErr;

    let guardianId = existingGuardian?.id ?? null;
    if (!guardianId) {
      const { data: insertedGuardian, error: guardianInsertErr } = await supabase
        .from("guardians")
        .insert({ full_name: tutorName, phone: tutorPhone })
        .select("id")
        .single();
      if (guardianInsertErr) throw guardianInsertErr;
      guardianId = insertedGuardian.id;
    }

    const { data: existingStudent, error: studentSearchErr } = await supabase
      .from("students")
      .select("id")
      .eq("full_name", studentName)
      .eq("guardian_id", guardianId)
      .maybeSingle();
    if (studentSearchErr) throw studentSearchErr;

    if (existingStudent?.id) {
      const { error: updateErr } = await supabase
        .from("students")
        .update({
          grade_id: gradeId,
          section_id: sectionId,
          status,
        })
        .eq("id", existingStudent.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase.from("students").insert({
        full_name: studentName,
        guardian_id: guardianId,
        grade_id: gradeId,
        section_id: sectionId,
        status,
      });
      if (insertErr) throw insertErr;
    }

    processed += 1;
  }

  return { processed, issues };
}

async function importEnrollments(rows: ParsedRow[]) {
  const issues: ValidationIssue[] = [];
  let processed = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const year = Number(row.academic_year);
    const total = Number(row.total_amount);
    const paid = Number(row.paid_amount);
    const currency = row.currency === "USD" ? "USD" : "NIO";
    const statusRaw = row.status;
    const status =
      statusRaw === "PENDIENTE" || statusRaw === "PARCIAL" || statusRaw === "PAGADO"
        ? statusRaw
        : paid >= total
          ? "PAGADO"
          : paid > 0
            ? "PARCIAL"
            : "PENDIENTE";
    const enrolledAt = row.enrolled_at || new Date().toISOString();

    if (!studentName || !Number.isFinite(year) || !Number.isFinite(total) || !Number.isFinite(paid)) {
      issues.push({ row: rowNum, message: "Fila de matrícula inválida." });
      continue;
    }

    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("full_name", studentName)
      .maybeSingle();
    if (studentErr) throw studentErr;
    if (!student?.id) {
      issues.push({ row: rowNum, message: `Estudiante no encontrado: ${studentName}` });
      continue;
    }

    const { data: existingEnrollment, error: enrollmentErr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", student.id)
      .eq("academic_year", year)
      .maybeSingle();
    if (enrollmentErr) throw enrollmentErr;

    if (existingEnrollment?.id) {
      const { error: updateErr } = await supabase
        .from("enrollments")
        .update({
          total_amount: total,
          paid_amount: paid,
          change_amount: 0,
          currency,
          status,
        })
        .eq("id", existingEnrollment.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase.from("enrollments").insert({
        student_id: student.id,
        academic_year: year,
        total_amount: total,
        paid_amount: paid,
        change_amount: 0,
        currency,
        status,
        enrolled_at: enrolledAt,
      });
      if (insertErr) throw insertErr;
    }

    if (paid > 0) {
      const { data: existingPayment, error: paymentSearchErr } = await supabase
        .from("payments")
        .select("id")
        .eq("student_id", student.id)
        .eq("concept", "MATRICULA")
        .eq("academic_year", year)
        .eq("amount", paid)
        .maybeSingle();
      if (paymentSearchErr) throw paymentSearchErr;

      if (!existingPayment?.id) {
        const { error: paymentInsertErr } = await supabase.from("payments").insert({
          student_id: student.id,
          concept: "MATRICULA",
          amount: paid,
          received_amount: paid,
          change_amount: 0,
          currency,
          academic_year: year,
          paid_at: enrolledAt,
          method: currency === "USD" ? "DOLAR" : "EFECTIVO",
          description: status,
          status: "COMPLETADO",
        });
        if (paymentInsertErr) throw paymentInsertErr;
      }
    }

    processed += 1;
  }

  return { processed, issues };
}

async function importMonthlyPayments(rows: ParsedRow[]) {
  const issues: ValidationIssue[] = [];
  let processed = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const year = Number(row.academic_year);
    const month = Number(row.month);
    const amount = Number(row.amount);
    const received = Number(row.received_amount || row.amount);
    const currency = row.currency === "USD" ? "USD" : "NIO";
    const paidAt = row.paid_at || new Date().toISOString();
    const method = row.method || (currency === "USD" ? "DOLAR" : "EFECTIVO");

    if (
      !studentName ||
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isFinite(amount)
    ) {
      issues.push({ row: rowNum, message: "Fila de mensualidad inválida." });
      continue;
    }

    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("full_name", studentName)
      .maybeSingle();
    if (studentErr) throw studentErr;
    if (!student?.id) {
      issues.push({ row: rowNum, message: `Estudiante no encontrado: ${studentName}` });
      continue;
    }

    const { data: charge, error: chargeErr } = await supabase
      .from("charges")
      .select("id,amount,paid_amount,currency,status")
      .eq("student_id", student.id)
      .eq("academic_year", year)
      .eq("concept", "MENSUALIDAD")
      .eq("month", month)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (chargeErr) throw chargeErr;
    if (!charge?.id) {
      issues.push({ row: rowNum, message: `No existe cargo de mensualidad para ${studentName} mes ${month}.` });
      continue;
    }

    if (charge.currency !== currency) {
      issues.push({
        row: rowNum,
        message: `Moneda distinta al cargo (${charge.currency}). Importa con la misma moneda del cargo.`,
      });
      continue;
    }

    const totalCharge = Number(charge.amount || 0);
    const paidSoFar = Number(charge.paid_amount || 0);
    const remaining = Math.max(totalCharge - paidSoFar, 0);
    if (remaining <= 0.0001 || charge.status === "PAGADO") {
      issues.push({ row: rowNum, message: `Cargo ya pagado para ${studentName} mes ${month}.` });
      continue;
    }

    const applied = Math.min(amount, remaining);
    const nextPaid = paidSoFar + applied;
    const newStatus = nextPaid + 0.0001 >= totalCharge ? "PAGADO" : "PARCIAL";
    const change = Math.max(received - applied, 0);

    const { data: existingPayment, error: paymentSearchErr } = await supabase
      .from("payments")
      .select("id")
      .eq("student_id", student.id)
      .eq("concept", "MENSUALIDAD")
      .eq("academic_year", year)
      .eq("month", month)
      .eq("amount", applied)
      .eq("currency", currency)
      .maybeSingle();
    if (paymentSearchErr) throw paymentSearchErr;

    if (!existingPayment?.id) {
      const { error: paymentInsertErr } = await supabase.from("payments").insert({
        student_id: student.id,
        charge_id: charge.id,
        concept: "MENSUALIDAD",
        academic_year: year,
        month,
        amount: Number(applied.toFixed(2)),
        received_amount: Number(received.toFixed(2)),
        change_amount: Number(change.toFixed(2)),
        currency,
        method,
        paid_at: paidAt,
        status: "COMPLETADO",
        description: newStatus,
      });
      if (paymentInsertErr) throw paymentInsertErr;
    }

    const { error: chargeUpdateErr } = await supabase
      .from("charges")
      .update({
        paid_amount: Number(nextPaid.toFixed(2)),
        status: newStatus,
      })
      .eq("id", charge.id);
    if (chargeUpdateErr) throw chargeUpdateErr;

    processed += 1;
  }

  return { processed, issues };
}

export default function Importaciones() {
  const [tab, setTab] = useState<ImportTab>("estudiantes");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);

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
    try {
      let importResult: { processed: number; issues: ValidationIssue[] };
      if (tab === "estudiantes") {
        importResult = await importStudents(rows);
      } else if (tab === "matriculas") {
        importResult = await importEnrollments(rows);
      } else {
        importResult = await importMonthlyPayments(rows);
      }

      const mergedIssues = [...issues, ...importResult.issues];
      setIssues(mergedIssues);
      setResult({
        processed: importResult.processed,
        failed: mergedIssues.length,
      });

      if (importResult.processed > 0) {
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
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plantilla
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input
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
                <Button onClick={() => void runImport()} disabled={running || rows.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  {running ? "Importando..." : "Ejecutar importación"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetState}>
                  Limpiar vista
                </Button>
              </div>

              {result && (
                <div className="rounded-md border p-3 text-sm bg-muted/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Procesadas: {result.processed}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
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
