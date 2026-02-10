import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

/* ================= FETCHERS ================= */

const fetchStudent = async (id: string) => {
  // 1️⃣ Estudiante base
  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  // 2️⃣ Tutor
  const { data: guardian } = await supabase
    .from("guardians")
    .select("full_name, phone")
    .eq("id", student.guardian_id)
    .single();

  // 3️⃣ Grado
  const { data: grade } = await supabase
    .from("grades")
    .select("name")
    .eq("id", student.grade_id)
    .single();

  // 4️⃣ Sección
  const { data: section } = await supabase
    .from("sections")
    .select("name")
    .eq("id", student.section_id)
    .single();

  return {
    ...student,
    guardian,
    grade,
    section,
  };
};

const fetchCharges = async (id: string) => {
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("student_id", id)
    .order("month");

  if (error) throw error;
  return data;
};

const fetchPayments = async (id: string) => {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", id)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data;
};

/* ================= COMPONENT ================= */

export default function Historial() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: () => fetchStudent(id!),
    enabled: !!id,
  });

  const { data: charges = [] } = useQuery({
    queryKey: ["charges", id],
    queryFn: () => fetchCharges(id!),
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => fetchPayments(id!),
    enabled: !!id,
  });

  if (!student) return null;

  const totalPaid = payments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  const totalPending = charges
    .filter((c: any) => c.status === "PENDIENTE")
    .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

  return (
    <DashboardLayout
      title="Historial Financiero"
      subtitle="Detalle de pagos del estudiante"
    >
      <Button variant="ghost" onClick={() => navigate("/estudiantes")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      {/* Student Card */}
      <div className="metric-card mt-4 mb-6">
        <h2 className="text-xl font-bold">{student.full_name}</h2>
        <p className="text-sm text-muted-foreground">
          #{student.enrollment_code} • {student.grade?.name}{" "}
          {student.section?.name}
        </p>
        <p className="text-sm mt-1">
          Tutor: {student.guardian?.full_name} —{" "}
          {student.guardian?.phone}
        </p>
        <Badge
          variant="outline"
          className={
            student.status === "ACTIVO"
              ? "badge-success mt-2"
              : "badge-destructive mt-2"
          }
        >
          {student.status === "ACTIVO" ? "Solvente" : "Moroso"}
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Total Pagado</p>
          <p className="text-2xl font-bold text-success">
            C${totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pendiente</p>
          <p className="text-2xl font-bold text-warning">
            C${totalPending.toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Meses Pendientes</p>
          <p className="text-2xl font-bold">
            {charges.filter((c: any) => c.status === "PENDIENTE").length}
          </p>
        </div>
      </div>

      {/* Pending Charges */}
      <h3 className="font-semibold mb-2">Mensualidades Pendientes</h3>
      <div className="table-container mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges
              .filter((c: any) => c.status === "PENDIENTE")
              .map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.month}</TableCell>
                  <TableCell>C${c.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="badge-warning">
                      Pendiente
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Payments */}
      <h3 className="font-semibold mb-2">Pagos Realizados</h3>
      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.concept}</TableCell>
                <TableCell>{p.month ?? "-"}</TableCell>
                <TableCell>C${p.amount}</TableCell>
                <TableCell>{p.method}</TableCell>
                <TableCell>
                  {new Date(p.paid_at).toLocaleDateString("es-NI")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
