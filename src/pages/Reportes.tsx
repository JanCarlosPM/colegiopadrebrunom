import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Users, DollarSign, AlertTriangle } from "lucide-react";
import {
  MONTHS_ES,
  convertCurrency,
  formatMoney,
  normalizeCurrency,
} from "@/lib/billing";
import { toast } from "sonner";

const REPORT_CATEGORIES = {
  resumen: "Resumen",
  estudiantes: "Estudiantes",
  matriculas: "Matrículas",
  mensualidades: "Mensualidades",
  financiero: "Ingresos y caja",
  morosidad: "Morosidad",
} as const;

const REPORT_TYPES: { value: string; label: string; category: keyof typeof REPORT_CATEGORIES }[] = [
  { value: "resumen-ejecutivo", label: "Resumen ejecutivo", category: "resumen" },
  { value: "estudiantes", label: "Listado de estudiantes", category: "estudiantes" },
  { value: "estudiantes-por-grado", label: "Estudiantes por grado", category: "estudiantes" },
  { value: "matriculas", label: "Matrículas del año", category: "matriculas" },
  { value: "matriculas-por-estado", label: "Matrículas por estado", category: "matriculas" },
  { value: "mensualidades", label: "Cargos de mensualidad", category: "mensualidades" },
  { value: "pagos", label: "Pagos registrados", category: "financiero" },
  { value: "ingresos-por-mes", label: "Ingresos por mes", category: "financiero" },
  { value: "caja", label: "Movimientos de caja", category: "financiero" },
  { value: "devoluciones", label: "Devoluciones (cambio)", category: "financiero" },
  { value: "solventes", label: "Estudiantes solventes", category: "morosidad" },
  { value: "morosos", label: "Estudiantes morosos", category: "morosidad" },
  { value: "morosidad-detallada", label: "Morosidad detallada", category: "morosidad" },
  { value: "parciales", label: "Pagos parciales", category: "morosidad" },
  { value: "pendientes", label: "Sin matrícula", category: "morosidad" },
];

type StudentReportRow = {
  id: string;
  full_name: string;
  status?: string | null;
  guardians?: { full_name?: string | null; phone?: string | null } | null;
  grades?: { name?: string | null } | null;
  sections?: { name?: string | null } | null;
};

type EnrollmentReportRow = {
  id: string;
  student_id: string;
  academic_year?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  currency?: string | null;
  status?: string | null;
  enrolled_at?: string | null;
};

type ChargeReportRow = {
  id: string;
  student_id: string;
  academic_year?: number | null;
  concept?: string | null;
  month?: number | null;
  amount?: number | null;
  paid_amount?: number | null;
  currency?: string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type PaymentReportRow = {
  id: string;
  student_id: string;
  charge_id?: string | null;
  concept?: string | null;
  academic_year?: number | null;
  month?: number | null;
  amount?: number | null;
  received_amount?: number | null;
  change_amount?: number | null;
  currency?: string | null;
  method?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type ReportRow = Record<string, string | number | null | undefined>;

const EMPTY_STUDENTS: StudentReportRow[] = [];
const EMPTY_ENROLLMENTS: EnrollmentReportRow[] = [];
const EMPTY_CHARGES: ChargeReportRow[] = [];
const EMPTY_PAYMENTS: PaymentReportRow[] = [];

/* ================= FETCH ================= */

const fetchReportData = async (): Promise<{
  students: StudentReportRow[];
  enrollments: EnrollmentReportRow[];
  charges: ChargeReportRow[];
  payments: PaymentReportRow[];
}> => {
  const [studentsRes, enrollmentsRes, chargesRes, paymentsRes] = await Promise.all([
    supabase.from("students").select(`
      id,
      full_name,
      status,
      guardians ( full_name, phone ),
      grades ( name ),
      sections ( name )
    `),
    supabase.from("enrollments").select(`
      id,
      student_id,
      academic_year,
      total_amount,
      paid_amount,
      currency,
      status,
      enrolled_at
    `),
    supabase.from("charges").select(`
      id,
      student_id,
      academic_year,
      concept,
      month,
      amount,
      paid_amount,
      currency,
      status,
      due_date,
      created_at
    `),
    supabase.from("payments").select(`
      id,
      student_id,
      charge_id,
      concept,
      academic_year,
      month,
      amount,
      received_amount,
      change_amount,
      currency,
      method,
      status,
      paid_at,
      created_at
    `),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;
  if (chargesRes.error) throw chargesRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  return {
    students: (studentsRes.data ?? []) as StudentReportRow[],
    enrollments: (enrollmentsRes.data ?? []) as EnrollmentReportRow[],
    charges: (chargesRes.data ?? []) as ChargeReportRow[],
    payments: (paymentsRes.data ?? []) as PaymentReportRow[],
  };
};

/* ================= COMPONENT ================= */

export default function Reportes() {
  const { data } = useQuery({
    queryKey: ["reportes-data"],
    queryFn: fetchReportData,
  });

  const students = data?.students ?? EMPTY_STUDENTS;
  const enrollments = data?.enrollments ?? EMPTY_ENROLLMENTS;
  const charges = data?.charges ?? EMPTY_CHARGES;
  const payments = data?.payments ?? EMPTY_PAYMENTS;

  const [tipoReporte, setTipoReporte] = useState("resumen-ejecutivo");
  const [grado, setGrado] = useState("todos");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const year = Number(anio);

  const filteredStudents = useMemo(
    () =>
      grado === "todos"
        ? students
        : students.filter((s) => s.grades?.name === grado),
    [students, grado]
  );

  const studentsById = useMemo(() => {
    const map = new Map<string, StudentReportRow>();
    students.forEach((student) => map.set(student.id, student));
    return map;
  }, [students]);

  const paymentsInYear = useMemo(
    () => payments.filter((p: { academic_year?: number }) => Number(p.academic_year) === year),
    [payments, year]
  );

  const chargesInYear = useMemo(
    () =>
      charges.filter(
        (c: { academic_year?: number; concept?: string }) =>
          Number(c.academic_year) === year && c.concept === "MENSUALIDAD"
      ),
    [charges, year]
  );

  const enrollmentsInYear = useMemo(
    () => enrollments.filter((e: { academic_year?: number }) => Number(e.academic_year) === year),
    [enrollments, year]
  );

  const reportData = useMemo(() => {
    if (tipoReporte === "resumen-ejecutivo") {
      const totalMatriculados = enrollmentsInYear.length;
      const ingresosMatriculaNIO = enrollmentsInYear.reduce(
        (sum: number, e: { currency?: string; paid_amount?: number }) =>
          e.currency === "NIO" ? sum + Number(e.paid_amount || 0) : sum,
        0
      );
      const ingresosMatriculaUSD = enrollmentsInYear.reduce(
        (sum: number, e: { currency?: string; paid_amount?: number }) =>
          e.currency === "USD" ? sum + Number(e.paid_amount || 0) : sum,
        0
      );
      const pagosMatricula = paymentsInYear.filter((p: { concept?: string }) => p.concept === "MATRICULA");
      const ingresosMatriculaPagosNIO = pagosMatricula.reduce(
        (sum: number, p: { currency?: string; amount?: number }) =>
          p.currency === "NIO" ? sum + Number(p.amount || 0) : sum,
        0
      );
      const ingresosMatriculaPagosUSD = pagosMatricula.reduce(
        (sum: number, p: { currency?: string; amount?: number }) =>
          p.currency === "USD" ? sum + Number(p.amount || 0) : sum,
        0
      );
      const pagosMensualidad = paymentsInYear.filter((p: { concept?: string }) => p.concept === "MENSUALIDAD");
      const ingresosMensualidadNIO = pagosMensualidad.reduce(
        (sum: number, p: { currency?: string; amount?: number }) =>
          p.currency === "NIO" ? sum + Number(p.amount || 0) : sum,
        0
      );
      const ingresosMensualidadUSD = pagosMensualidad.reduce(
        (sum: number, p: { currency?: string; amount?: number }) =>
          p.currency === "USD" ? sum + Number(p.amount || 0) : sum,
        0
      );
      const pendienteMatricula = enrollmentsInYear.reduce(
        (sum: { nio: number; usd: number }, e: { total_amount?: number; paid_amount?: number; currency?: string }) => {
          const pending = Math.max(Number(e.total_amount || 0) - Number(e.paid_amount || 0), 0);
          const currency = normalizeCurrency(e.currency);
          if (currency === "USD") {
            sum.usd += pending;
            sum.nio += convertCurrency(pending, "USD", "NIO");
          } else {
            sum.nio += pending;
            sum.usd += convertCurrency(pending, "NIO", "USD");
          }
          return sum;
        },
        { nio: 0, usd: 0 }
      );
      const pendienteMensualidades = chargesInYear.reduce(
        (sum: { nio: number; usd: number }, c: { amount?: number; paid_amount?: number; currency?: string }) => {
          const pending = Math.max(Number(c.amount || 0) - Number(c.paid_amount || 0), 0);
          const currency = normalizeCurrency(c.currency);
          if (currency === "USD") {
            sum.usd += pending;
            sum.nio += convertCurrency(pending, "USD", "NIO");
          } else {
            sum.nio += pending;
            sum.usd += convertCurrency(pending, "NIO", "USD");
          }
          return sum;
        },
        { nio: 0, usd: 0 }
      );
      return [
        { indicador: "Matrículas del año", valor: totalMatriculados, tipo: "numero" },
        { indicador: "Ingresos matrícula (C$)", valor: (ingresosMatriculaPagosNIO || ingresosMatriculaNIO).toFixed(2), tipo: "moneda" },
        { indicador: "Ingresos matrícula (USD)", valor: (ingresosMatriculaPagosUSD || ingresosMatriculaUSD).toFixed(2), tipo: "moneda" },
        { indicador: "Ingresos mensualidades (C$)", valor: ingresosMensualidadNIO.toFixed(2), tipo: "moneda" },
        { indicador: "Ingresos mensualidades (USD)", valor: ingresosMensualidadUSD.toFixed(2), tipo: "moneda" },
        {
          indicador: "Pendiente matrículas",
          valor: `C$ ${pendienteMatricula.nio.toFixed(2)} | $ ${pendienteMatricula.usd.toFixed(2)}`,
          tipo: "moneda",
        },
        {
          indicador: "Pendiente mensualidades",
          valor: `C$ ${pendienteMensualidades.nio.toFixed(2)} | $ ${pendienteMensualidades.usd.toFixed(2)}`,
          tipo: "moneda",
        },
      ];
    }

    if (tipoReporte === "estudiantes-por-grado") {
      const byGrade: Record<string, number> = {};
      filteredStudents.forEach((s: { grades?: { name?: string }; status?: string }) => {
        const g = s.grades?.name ?? "Sin grado";
        if (s.status === "ACTIVO") byGrade[g] = (byGrade[g] || 0) + 1;
      });
      return Object.entries(byGrade)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([gradoNombre, cantidad]) => ({ grado: gradoNombre, cantidad, estudiantes: cantidad }));
    }

    if (tipoReporte === "matriculas-por-estado") {
      const pagado = enrollmentsInYear.filter((e: { status?: string }) => e.status === "PAGADO").length;
      const parcial = enrollmentsInYear.filter((e: { status?: string }) => e.status === "PARCIAL").length;
      const pendiente = enrollmentsInYear.filter((e: { status?: string }) => e.status === "PENDIENTE").length;
      return [
        { estado: "PAGADO", cantidad: pagado },
        { estado: "PARCIAL", cantidad: parcial },
        { estado: "PENDIENTE", cantidad: pendiente },
        { estado: "TOTAL", cantidad: enrollmentsInYear.length },
      ];
    }

    if (tipoReporte === "ingresos-por-mes") {
      const byMonth: Record<number, { nio: number; usd: number }> = {};
      for (let m = 1; m <= 12; m++) byMonth[m] = { nio: 0, usd: 0 };
      paymentsInYear.forEach((p: { month?: number; amount?: number; currency?: string }) => {
        const m = p.month ?? 1;
        if (p.currency === "NIO") byMonth[m].nio += Number(p.amount || 0);
        else byMonth[m].usd += Number(p.amount || 0);
      });
      return Object.entries(byMonth).map(([mesNum, vals]) => ({
        mes: MONTHS_ES[Number(mesNum) - 1],
        "C$": Number(vals.nio.toFixed(2)),
        "$ USD": Number(vals.usd.toFixed(2)),
        total_nio: vals.nio,
        total_usd: vals.usd,
      }));
    }

    if (tipoReporte === "caja") {
      let list = [...payments];
      if (fechaDesde) {
        list = list.filter((p: { paid_at?: string }) => new Date(p.paid_at || 0) >= new Date(fechaDesde));
      }
      if (fechaHasta) {
        const end = new Date(fechaHasta);
        end.setHours(23, 59, 59, 999);
        list = list.filter((p: { paid_at?: string }) => new Date(p.paid_at || 0) <= end);
      }
      if (year) {
        list = list.filter((p: { academic_year?: number }) => Number(p.academic_year) === year);
      }
      return list.map((p) => {
        const s = studentsById.get(p.student_id);
        return {
          fecha: p.paid_at ? new Date(p.paid_at).toLocaleString("es-NI") : "—",
          estudiante: s?.full_name ?? "—",
          grado: s?.grades?.name ?? "—",
          concepto: p.concept ?? "—",
          mes: p.concept === "MENSUALIDAD" && p.month ? MONTHS_ES[p.month - 1] : "—",
          monto: formatMoney(Number(p.amount || 0), p.currency),
          recibido: Number(p.received_amount ?? p.amount ?? 0).toLocaleString(),
          cambio: Number(p.change_amount ?? 0).toLocaleString(),
          metodo: p.method ?? "—",
        };
      });
    }

    if (tipoReporte === "devoluciones") {
      const conCambio = payments.filter((p: { change_amount?: number }) => Number(p.change_amount || 0) > 0);
      let list = conCambio;
      if (year) list = list.filter((p: { academic_year?: number }) => Number(p.academic_year) === year);
      if (fechaDesde) list = list.filter((p: { paid_at?: string }) => new Date(p.paid_at || 0) >= new Date(fechaDesde));
      if (fechaHasta) {
        const end = new Date(fechaHasta);
        end.setHours(23, 59, 59, 999);
        list = list.filter((p: { paid_at?: string }) => new Date(p.paid_at || 0) <= end);
      }
      return list.map((p) => {
        const s = studentsById.get(p.student_id);
        return {
          fecha: p.paid_at ? new Date(p.paid_at).toLocaleString("es-NI") : "—",
          estudiante: s?.full_name ?? "—",
          concepto: p.concept ?? "—",
          monto_pagado: `${p.currency === "USD" ? "$" : "C$"} ${Number(p.amount || 0).toLocaleString()}`,
          recibido: Number(p.received_amount ?? 0).toLocaleString(),
          devolucion: Number(p.change_amount ?? 0).toLocaleString(),
        };
      });
    }

    if (tipoReporte === "morosidad-detallada") {
      const rows: ReportRow[] = [];
      filteredStudents.forEach((s) => {
        const studentCharges = chargesInYear.filter(
          (c) =>
            c.student_id === s.id &&
            (c.status === "PENDIENTE" || c.status === "PARCIAL")
        );
        studentCharges.forEach((c) => {
          const total = Number(c.amount || 0);
          const pagado = Number(c.paid_amount || 0);
          const pendiente = total - pagado;
          if (pendiente <= 0) return;
          rows.push({
            estudiante: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            mes: c.month ? MONTHS_ES[c.month - 1] : "—",
            monto_cargo: formatMoney(total, c.currency),
            pagado: formatMoney(pagado, c.currency),
            pendiente: formatMoney(pendiente, c.currency),
            estado: c.status,
          });
        });
      });
      return rows;
    }

    if (tipoReporte === "estudiantes") {
      return filteredStudents
        .filter((s: { status?: string }) => s.status === "ACTIVO")
        .map((s) => ({
          nombre: s.full_name,
          grado: s.grades?.name ?? "—",
          seccion: s.sections?.name ?? "—",
          encargado: s.guardians?.full_name ?? "—",
          telefono: s.guardians?.phone ?? "—",
          estado: s.status ?? "—",
        }));
    }

    if (tipoReporte === "matriculas") {
      return filteredStudents
        .map((s) => {
          const enrollment = enrollmentsInYear.find((e) => e.student_id === s.id);
          if (!enrollment) return null;
          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            total: `${enrollment.currency === "USD" ? "$" : "C$"} ${Number(enrollment.total_amount || 0).toLocaleString()}`,
            pagado: `${enrollment.currency === "USD" ? "$" : "C$"} ${Number(enrollment.paid_amount || 0).toLocaleString()}`,
            estado: enrollment.status,
            fecha: enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString("es-NI") : "—",
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "mensualidades") {
      const rows: ReportRow[] = [];
      filteredStudents.forEach((s) => {
        const studentCharges = chargesInYear.filter(
          (c) =>
            s.id === c.student_id &&
            (mes === "todos" || Number(c.month) === Number(mes))
        );
        studentCharges.forEach((c) => {
          rows.push({
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            mes: c.month ? MONTHS_ES[c.month - 1] : "—",
            monto: formatMoney(Number(c.amount || 0), c.currency),
            pagado: formatMoney(Number(c.paid_amount || 0), c.currency),
            estado: c.status,
            vencimiento: c.due_date ? new Date(c.due_date).toLocaleDateString("es-NI") : "—",
          });
        });
      });
      return rows;
    }

    if (tipoReporte === "pagos") {
      const rows: ReportRow[] = [];
      const filtered = mes === "todos"
        ? paymentsInYear
        : paymentsInYear.filter((p) => p.concept !== "MENSUALIDAD" || Number(p.month) === Number(mes));
      filtered.forEach((p) => {
        const s = studentsById.get(p.student_id);
        rows.push({
          nombre: s?.full_name ?? "—",
          grado: s?.grades?.name ?? "—",
          seccion: s?.sections?.name ?? "—",
          concepto: p.concept,
          mes: p.concept === "MENSUALIDAD" && p.month ? MONTHS_ES[p.month - 1] : "—",
          monto: formatMoney(Number(p.amount || 0), p.currency),
          metodo: p.method ?? "—",
          estado: p.status ?? "—",
          fecha: p.paid_at ? new Date(p.paid_at).toLocaleString("es-NI") : "—",
        });
      });
      return rows;
    }

    if (tipoReporte === "solventes") {
      return filteredStudents
        .map((s) => {
          const studentCharges = chargesInYear.filter((c) => c.student_id === s.id);
          const hasPending = studentCharges.some((c) => c.status === "PENDIENTE" || c.status === "PARCIAL");
          if (hasPending) return null;
          const hasAny = studentCharges.length > 0;
          if (!hasAny) return null;
          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "SOLVENTE",
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "morosos") {
      return filteredStudents
        .map((s) => {
          const studentCharges = chargesInYear.filter((c) => c.student_id === s.id);
          const hasPending = studentCharges.some((c) => c.status === "PENDIENTE");
          if (!hasPending) return null;
          const pendingNio = studentCharges
            .filter((c) => c.status === "PENDIENTE" || c.status === "PARCIAL")
            .reduce((sum: number, c) => {
              const pending = Math.max(Number(c.amount || 0) - Number(c.paid_amount || 0), 0);
              return normalizeCurrency(c.currency) === "USD" ? sum + convertCurrency(pending, "USD", "NIO") : sum + pending;
            }, 0);
          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "MOROSO",
            pendiente: `C$ ${pendingNio.toFixed(2)} | $ ${convertCurrency(pendingNio, "NIO", "USD").toFixed(2)}`,
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "parciales") {
      return filteredStudents
        .map((s) => {
          const enrollment = enrollmentsInYear.find(
            (e) => e.student_id === s.id && e.status === "PARCIAL"
          );
          const chargeParcial = chargesInYear.some(
            (c) => c.student_id === s.id && c.status === "PARCIAL"
          );
          if (!enrollment && !chargeParcial) return null;
          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "PARCIAL",
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "pendientes") {
      return filteredStudents
        .map((s) => {
          const enrollment = enrollmentsInYear.find((e) => e.student_id === s.id);
          if (enrollment) return null;
          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "SIN MATRÍCULA",
          };
        })
        .filter(Boolean);
    }

    return [];
  }, [
    tipoReporte,
    filteredStudents,
    enrollmentsInYear,
    chargesInYear,
    paymentsInYear,
    payments,
    studentsById,
    year,
    mes,
    fechaDesde,
    fechaHasta,
  ]);

  const summaryCards = useMemo(() => {
    if (tipoReporte !== "resumen-ejecutivo" || reportData.length === 0) return null;
    const d = reportData as { indicador: string; valor: string; tipo?: string }[];
    const matriculados = d.find((r) => r.indicador === "Matrículas del año");
    const pendMat = d.find((r) => r.indicador === "Pendiente matrículas");
    const pendMen = d.find((r) => r.indicador === "Pendiente mensualidades");
    return { matriculados: matriculados?.valor ?? "0", pendMat: pendMat?.valor ?? "0", pendMen: pendMen?.valor ?? "0" };
  }, [tipoReporte, reportData]);

  const exportExcel = async () => {
    if (reportData.length === 0 || exporting) return;
    try {
      setExporting("excel");
      const XLSX = await import("xlsx");
      const sheetData =
        Array.isArray(reportData) && reportData.length > 0 && typeof reportData[0] === "object"
          ? reportData.map((r) => {
              const obj = { ...r };
              if ("total_nio" in obj) delete obj.total_nio;
              if ("total_usd" in obj) delete obj.total_usd;
              return obj;
            })
          : reportData;
      const worksheet = XLSX.utils.json_to_sheet(sheetData as object[]);
      const workbook = XLSX.utils.book_new();
      const sheetName = REPORT_TYPES.find((t) => t.value === tipoReporte)?.label ?? "Reporte";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
      const nombre = `reporte_${tipoReporte}_${anio}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, nombre);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo exportar el archivo Excel.");
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    if (reportData.length === 0 || exporting) return;
    try {
      setExporting("pdf");
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF();
      const title = REPORT_TYPES.find((t) => t.value === tipoReporte)?.label ?? tipoReporte;
      doc.setFontSize(14);
      doc.text(`Reporte: ${title}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Año: ${anio}  |  Generado: ${new Date().toLocaleDateString("es-NI")}`, 14, 22);

      const headers = reportData.length > 0 ? Object.keys(reportData[0]).filter((k) => !k.startsWith("total_")) : [];
      const body = (reportData as ReportRow[]).map((r) => headers.map((h) => (r[h] != null ? String(r[h]) : "—")));

      autoTable(doc, {
        head: [headers],
        body,
        startY: 28,
        styles: { fontSize: 8 },
      });

      doc.save(`reporte_${tipoReporte}_${anio}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo exportar el PDF.");
    } finally {
      setExporting(null);
    }
  };

  const gradeOptions = useMemo(
    () => [...new Set(students.map((s) => s.grades?.name).filter(Boolean))],
    [students]
  );

  const showDateRange = tipoReporte === "caja" || tipoReporte === "devoluciones";
  const showMes = !["resumen-ejecutivo", "estudiantes-por-grado", "matriculas-por-estado", "ingresos-por-mes", "estudiantes", "pendientes"].includes(tipoReporte);

  return (
    <DashboardLayout title="Reportes" subtitle="Generar reportes de estudiantes, matrículas, ingresos y morosidad">
      <Card className="p-4 mb-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Seleccione el tipo de reporte y los criterios</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Tipo de reporte</Label>
            <Select value={tipoReporte} onValueChange={setTipoReporte}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_CATEGORIES).map(([key, label]) => (
                  <div key={key}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
                    {REPORT_TYPES.filter((t) => t.category === key).map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Año</Label>
            <Input
              type="number"
              min="2020"
              max="2030"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
            />
          </div>

          {showMes && (
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {MONTHS_ES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipoReporte !== "estudiantes-por-grado" && tipoReporte !== "matriculas-por-estado" && tipoReporte !== "resumen-ejecutivo" && tipoReporte !== "ingresos-por-mes" && (
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select value={grado} onValueChange={setGrado}>
                <SelectTrigger>
                  <SelectValue placeholder="Grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showDateRange && (
            <>
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </Card>

      {summaryCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Matrículas del año</span>
              </div>
              <p className="text-2xl font-semibold mt-1">{summaryCards.matriculados}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pendiente matrículas</span>
              </div>
              <p className="text-2xl font-semibold mt-1">{summaryCards.pendMat}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pendiente mensualidades</span>
              </div>
              <p className="text-2xl font-semibold mt-1">{summaryCards.pendMen}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="font-semibold">
            {reportData.length} {reportData.length === 1 ? "registro" : "registros"} encontrados
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={reportData.length === 0 || exporting !== null}>
              <FileText className="h-4 w-4 mr-2" />
              {exporting === "pdf" ? "Exportando..." : "PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={reportData.length === 0 || exporting !== null}>
              <Download className="h-4 w-4 mr-2" />
              {exporting === "excel" ? "Exportando..." : "Excel"}
            </Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[28rem]">
          {reportData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay datos para los filtros seleccionados.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b">
                  {reportData.length > 0 &&
                    Object.keys(reportData[0])
                      .filter((k) => !k.startsWith("total_"))
                      .map((key) => (
                        <th key={key} className="text-left p-2 font-medium capitalize whitespace-nowrap">
                          {key.replace(/_/g, " ")}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {(reportData as ReportRow[]).map((row, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    {Object.entries(row)
                      .filter(([k]) => !k.startsWith("total_"))
                      .map(([key, value]) => (
                        <td key={key} className="p-2">
                          {value != null ? String(value) : "—"}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
