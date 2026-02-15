import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

/* =========================
   CONSTANTE MESES
========================= */

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/* =========================
   COMPONENT
========================= */

export default function Historial() {

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [enrollment, setEnrollment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();

  /* =========================
     FETCH STUDENTS
  ========================= */

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          guardians ( full_name, phone ),
          grades ( name ),
          sections ( name )
        `)
        .order("full_name");

      setStudents(data || []);
    };

    fetchStudents();
  }, []);

  /* =========================
     FETCH DATA WHEN SELECTED
  ========================= */

  useEffect(() => {
    if (!selectedStudent) return;

    const fetchData = async () => {

      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", currentYear)
        .single();

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("concept", "MENSUALIDAD")
        .eq("academic_year", currentYear);

      const { data: chargesData } = await supabase
        .from("charges")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("concept", "MENSUALIDAD")
        .eq("academic_year", currentYear);

      setEnrollment(enrollmentData);
      setPayments(paymentsData || []);
      setCharges(chargesData || []);
    };

    fetchData();
  }, [selectedStudent]);

  /* =========================
     FILTRO BUSCADOR
  ========================= */

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  /* =========================
     CÁLCULOS
  ========================= */

  const totalPaid = useMemo(() => {
    const monthly = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const enrollmentPaid = enrollment?.amount_paid || 0;
    return monthly + enrollmentPaid;
  }, [payments, enrollment]);

  const monthsPaid = payments.length;
  const totalMonths = 12;
  const pendingMonths = totalMonths - monthsPaid;

  const totalPending = charges
    .filter((c) => c.status !== "PAGADO")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const generalStatus =
    totalPending > 0 || enrollment?.status !== "PAGADO"
      ? "Moroso"
      : "Solvente";

  /* =========================
     UI
  ========================= */

  return (
    <DashboardLayout
      title="Historial del Estudiante"
      subtitle="Vista detallada de pagos por estudiante"
    >
      {/* BUSCADOR */}
      <div className="max-w-md mb-6">
        <Input
          placeholder="Buscar estudiante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <div className="border rounded mt-2 max-h-40 overflow-y-auto bg-white">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                className="p-2 hover:bg-muted cursor-pointer"
                onClick={() => {
                  setSelectedStudent(s);
                  setSearch(s.full_name);
                }}
              >
                {s.full_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          {/* CARD ESTUDIANTE */}
          <div className="bg-card rounded-xl border shadow-sm p-5 space-y-3 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedStudent.full_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.grades?.name}{" "}
                  {selectedStudent.sections?.name
                    ? `— Sección ${selectedStudent.sections.name}`
                    : ""}
                </p>
              </div>

              <Badge
                className={
                  generalStatus === "Moroso"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }
              >
                {generalStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Padre/Madre:</span>{" "}
                {selectedStudent.guardians?.full_name}
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>{" "}
                {selectedStudent.guardians?.phone}
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total Pagado"
              value={`C$ ${totalPaid.toLocaleString()}`}
              icon={DollarSign}
              variant="success"
            />

            <StatsCard
              title="Total Pendiente"
              value={`C$ ${totalPending.toLocaleString()}`}
              icon={AlertTriangle}
              variant={totalPending > 0 ? "destructive" : "success"}
            />

            <StatsCard
              title="Meses Pagados"
              value={`${monthsPaid}/12`}
              icon={CheckCircle}
              variant="primary"
            />

            <StatsCard
              title="Meses Pendientes"
              value={pendingMonths}
              icon={Calendar}
              variant={pendingMonths > 0 ? "warning" : "success"}
            />
          </div>

          {/* MATRÍCULA */}
          <div className="bg-card rounded-xl border shadow-sm p-5 mb-6">
            <h3 className="font-semibold mb-3">
              Matrícula {currentYear}
            </h3>

            {enrollment ? (
              <div className="flex items-center gap-4 text-sm">
                <span>Total: C$ {enrollment.total_amount}</span>
                <span>Pagado: C$ {enrollment.amount_paid}</span>
                <Badge>
                  {enrollment.status}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin matrícula registrada
              </p>
            )}
          </div>

          {/* HISTORIAL MENSUALIDADES */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="font-semibold">
                Historial de Mensualidades
              </h3>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {MONTHS.map((m, i) => {
                    const payment = payments.find(
                      (p) => p.month === i + 1
                    );

                    const charge = charges.find(
                      (c) => c.month === i + 1
                    );

                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {m}
                        </TableCell>

                        <TableCell>
                          {charge ? `C$ ${charge.amount}` : "—"}
                        </TableCell>

                        <TableCell>
                          {payment
                            ? new Date(payment.paid_at).toLocaleDateString("es-NI")
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={
                              payment
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {payment ? "Pagado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
