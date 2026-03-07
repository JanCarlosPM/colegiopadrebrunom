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
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/* ================= FETCH ================= */

const fetchReportData = async () => {
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
    students: studentsRes.data ?? [],
    enrollments: enrollmentsRes.data ?? [],
    charges: chargesRes.data ?? [],
    payments: paymentsRes.data ?? [],
  };
};

/* ================= COMPONENT ================= */

export default function Reportes() {
  const { data } = useQuery({
    queryKey: ["reportes-data"],
    queryFn: fetchReportData,
  });

  const students = data?.students ?? [];
  const enrollments = data?.enrollments ?? [];
  const charges = data?.charges ?? [];
  const payments = data?.payments ?? [];

  const [tipoReporte, setTipoReporte] = useState("estudiantes");
  const [grado, setGrado] = useState("todos");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState("todos");

  const year = Number(anio);

  const reportData = useMemo(() => {
    const filteredStudents =
      grado === "todos"
        ? students
        : students.filter((s: any) => s.grades?.name === grado);

    if (tipoReporte === "estudiantes") {
      return filteredStudents.map((s: any) => ({
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
        .map((s: any) => {
          const enrollment = enrollments.find(
            (e: any) =>
              e.student_id === s.id &&
              Number(e.academic_year) === year
          );

          if (!enrollment) return null;

          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            total: `${enrollment.currency === "USD" ? "$" : "C$"} ${Number(enrollment.total_amount || 0).toLocaleString()}`,
            pagado: `${enrollment.currency === "USD" ? "$" : "C$"} ${Number(enrollment.paid_amount || 0).toLocaleString()}`,
            estado: enrollment.status,
            fecha: enrollment.enrolled_at
              ? new Date(enrollment.enrolled_at).toLocaleDateString("es-NI")
              : "—",
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "mensualidades") {
      const rows: any[] = [];

      filteredStudents.forEach((s: any) => {
        const studentCharges = charges.filter(
          (c: any) =>
            c.student_id === s.id &&
            Number(c.academic_year) === year &&
            c.concept === "MENSUALIDAD" &&
            (mes === "todos" || Number(c.month) === Number(mes))
        );

        studentCharges.forEach((c: any) => {
          rows.push({
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            mes: c.month ? MONTHS[c.month - 1] : "—",
            monto: `${c.currency === "USD" ? "$" : "C$"} ${Number(c.amount || 0).toLocaleString()}`,
            estado: c.status,
            vencimiento: c.due_date
              ? new Date(c.due_date).toLocaleDateString("es-NI")
              : "—",
          });
        });
      });

      return rows;
    }

    if (tipoReporte === "pagos") {
      const rows: any[] = [];

      filteredStudents.forEach((s: any) => {
        const studentPayments = payments.filter(
          (p: any) =>
            p.student_id === s.id &&
            Number(p.academic_year) === year &&
            (mes === "todos" ||
              p.concept !== "MENSUALIDAD" ||
              Number(p.month) === Number(mes))
        );

        studentPayments.forEach((p: any) => {
          rows.push({
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            concepto: p.concept,
            mes:
              p.concept === "MENSUALIDAD" && p.month
                ? MONTHS[p.month - 1]
                : "—",
            monto: `${p.currency === "USD" ? "$" : "C$"} ${Number(p.amount || 0).toLocaleString()}`,
            metodo: p.method ?? "—",
            estado: p.status ?? "—",
            fecha: p.paid_at
              ? new Date(p.paid_at).toLocaleDateString("es-NI")
              : "—",
          });
        });
      });

      return rows;
    }

    if (tipoReporte === "solventes") {
      return filteredStudents
        .map((s: any) => {
          const studentCharges = charges.filter(
            (c: any) =>
              c.student_id === s.id &&
              Number(c.academic_year) === year &&
              c.concept === "MENSUALIDAD"
          );

          const hasPending = studentCharges.some(
            (c: any) => c.status === "PENDIENTE" || c.status === "PARCIAL"
          );

          if (hasPending) return null;

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
        .map((s: any) => {
          const studentCharges = charges.filter(
            (c: any) =>
              c.student_id === s.id &&
              Number(c.academic_year) === year &&
              c.concept === "MENSUALIDAD"
          );

          const hasPending = studentCharges.some(
            (c: any) => c.status === "PENDIENTE"
          );

          if (!hasPending) return null;

          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "MOROSO",
          };
        })
        .filter(Boolean);
    }

    if (tipoReporte === "parciales") {
      return filteredStudents
        .map((s: any) => {
          const enrollment = enrollments.find(
            (e: any) =>
              e.student_id === s.id &&
              Number(e.academic_year) === year &&
              e.status === "PARCIAL"
          );

          const chargeParcial = charges.some(
            (c: any) =>
              c.student_id === s.id &&
              Number(c.academic_year) === year &&
              c.status === "PARCIAL"
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
        .map((s: any) => {
          const enrollment = enrollments.find(
            (e: any) =>
              e.student_id === s.id &&
              Number(e.academic_year) === year
          );

          if (enrollment) return null;

          return {
            nombre: s.full_name,
            grado: s.grades?.name ?? "—",
            seccion: s.sections?.name ?? "—",
            estado: "PENDIENTE",
          };
        })
        .filter(Boolean);
    }

    return [];
  }, [students, enrollments, charges, payments, tipoReporte, grado, year, mes]);

  /* ================= EXPORT EXCEL ================= */

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `reporte_${tipoReporte}_${anio}.xlsx`);
  };

  /* ================= EXPORT PDF ================= */

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte ${tipoReporte} - ${anio}`, 14, 15);

    const headers =
      reportData.length > 0 ? Object.keys(reportData[0]) : [];

    const body = reportData.map((r: any) =>
      headers.map((h) => r[h])
    );

    autoTable(doc, {
      head: [headers],
      body,
      startY: 20,
    });

    doc.save(`reporte_${tipoReporte}_${anio}.pdf`);
  };

  const gradeOptions = [
    ...new Set(
      students
        .map((s: any) => s.grades?.name)
        .filter(Boolean)
    ),
  ];

  return (
    <DashboardLayout
      title="Reportes"
      subtitle="Reportes basados en la estructura real de la BD"
    >
      <Card className="p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select value={tipoReporte} onValueChange={setTipoReporte}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo Reporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="estudiantes">Estudiantes</SelectItem>
            <SelectItem value="matriculas">Matrículas</SelectItem>
            <SelectItem value="mensualidades">Mensualidades</SelectItem>
            <SelectItem value="pagos">Pagos</SelectItem>
            <SelectItem value="solventes">Solventes</SelectItem>
            <SelectItem value="morosos">Morosos</SelectItem>
            <SelectItem value="parciales">Parciales</SelectItem>
            <SelectItem value="pendientes">Pendientes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={grado} onValueChange={setGrado}>
          <SelectTrigger>
            <SelectValue placeholder="Grado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {gradeOptions.map((g: any) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger>
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
      </Card>

      <Card className="p-4 mb-6">
        <p className="mb-4 font-semibold">
          {reportData.length} registros encontrados
        </p>

        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {reportData.length > 0 &&
                  Object.keys(reportData[0]).map((key) => (
                    <th key={key} className="text-left p-2 capitalize">
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row: any, i: number) => (
                <tr key={i} className="border-b">
                  {Object.values(row).map((value: any, j: number) => (
                    <td key={j} className="p-2">
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>

        <Button onClick={exportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>
    </DashboardLayout>
  );
}