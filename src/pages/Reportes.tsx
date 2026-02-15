import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ================= FETCHERS ================= */

const fetchStudentsData = async () => {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      grades ( name ),
      sections ( name ),
      charges ( status, amount ),
      enrollments ( status )
    `);

  if (error) throw error;
  return data ?? [];
};

/* ================= COMPONENT ================= */

export default function Reportes() {
  const { data: students = [] } = useQuery({
    queryKey: ["report-students"],
    queryFn: fetchStudentsData,
  });

  const [mes, setMes] = useState("todos");
  const [grado, setGrado] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [tipoReporte, setTipoReporte] = useState("estudiantes");

  /* ================= PROCESAMIENTO ================= */

  const reportData = useMemo(() => {
    let data = [...students];

    if (grado !== "todos") {
      data = data.filter((s: any) => s.grades?.name === grado);
    }

    const procesado = data.map((s: any) => {
      const pendientes = s.charges?.filter((c: any) => c.status === "PENDIENTE") || [];
      const parciales = s.charges?.filter((c: any) => c.status === "PARCIAL") || [];
      const pagado = s.charges?.filter((c: any) => c.status === "PAGADO") || [];

      let estadoFinal = "SOLVENTE";

      if (pendientes.length > 0) estadoFinal = "MOROSO";
      if (parciales.length > 0) estadoFinal = "PARCIAL";
      if (pagado.length === 0) estadoFinal = "PENDIENTE";

      return {
        nombre: s.full_name,
        grado: s.grades?.name,
        seccion: s.sections?.name,
        estado: estadoFinal,
      };
    });

    switch (tipoReporte) {
      case "solventes":
        return procesado.filter((s) => s.estado === "SOLVENTE");
      case "morosos":
        return procesado.filter((s) => s.estado === "MOROSO");
      case "parciales":
        return procesado.filter((s) => s.estado === "PARCIAL");
      case "pendientes":
        return procesado.filter((s) => s.estado === "PENDIENTE");
      default:
        return procesado;
    }
  }, [students, grado, estado, tipoReporte]);

  /* ================= EXPORT EXCEL ================= */

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `reporte_${tipoReporte}.xlsx`);
  };

  /* ================= EXPORT PDF ================= */

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte Escolar", 14, 15);

    autoTable(doc, {
      head: [["Nombre", "Grado", "Sección", "Estado"]],
      body: reportData.map((r) => [
        r.nombre,
        r.grado,
        r.seccion,
        r.estado,
      ]),
      startY: 20,
    });

    doc.save(`reporte_${tipoReporte}.pdf`);
  };

  /* ================= UI ================= */

  return (
    <DashboardLayout title="Reportes" subtitle="Reportes dinámicos del sistema">
      {/* FILTROS */}
      <Card className="p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select value={tipoReporte} onValueChange={setTipoReporte}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo Reporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="estudiantes">Todos los Estudiantes</SelectItem>
            <SelectItem value="solventes">Estudiantes Solventes</SelectItem>
            <SelectItem value="morosos">Estudiantes Morosos</SelectItem>
            <SelectItem value="parciales">Estudiantes Parciales</SelectItem>
            <SelectItem value="pendientes">Estudiantes Pendientes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={grado} onValueChange={setGrado}>
          <SelectTrigger>
            <SelectValue placeholder="Grado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {[...new Set(students.map((s: any) => s.grades?.name))].map(
              (g: any) =>
                g && (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                )
            )}
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
      </Card>

      {/* VISTA PREVIA */}
      <Card className="p-4 mb-6">
        <p className="mb-4 font-semibold">
          {reportData.length} registros encontrados
        </p>

        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Grado</th>
                <th className="text-left p-2">Sección</th>
                <th className="text-left p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{r.nombre}</td>
                  <td className="p-2">{r.grado}</td>
                  <td className="p-2">{r.seccion}</td>
                  <td className="p-2">{r.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EXPORTAR */}
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
