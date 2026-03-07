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
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          guardians ( full_name, phone ),
          grades ( name ),
          sections ( name )
        `)
        .order("full_name");

      if (error) {
        console.error("Error cargando estudiantes:", error);
        return;
      }

      setStudents(data || []);
    };

    fetchStudents();
  }, []);

  /* =========================
     FETCH DATA
  ========================= */

  const fetchStudentData = async (studentId: string) => {
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("academic_year", currentYear)
      .maybeSingle();

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept", "MENSUALIDAD")
      .eq("academic_year", currentYear)
      .order("month", { ascending: true });

    const { data: chargesData, error: chargesError } = await supabase
      .from("charges")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept", "MENSUALIDAD")
      .eq("academic_year", currentYear)
      .order("month", { ascending: true });

    if (enrollmentError) console.error("Error enrollment:", enrollmentError);
    if (paymentsError) console.error("Error payments:", paymentsError);
    if (chargesError) console.error("Error charges:", chargesError);

    setEnrollment(enrollmentData || null);
    setPayments(paymentsData || []);
    setCharges(chargesData || []);
  };

  useEffect(() => {
    if (!selectedStudent) return;
    fetchStudentData(selectedStudent.id);
  }, [selectedStudent, currentYear]);

  /* =========================
     REALTIME: ACTUALIZAR AL TOQUE
  ========================= */

  useEffect(() => {
    if (!selectedStudent) return;

    const channel = supabase
      .channel(`historial-${selectedStudent.id}-${currentYear}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${selectedStudent.id}`,
        },
        () => {
          fetchStudentData(selectedStudent.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "charges",
          filter: `student_id=eq.${selectedStudent.id}`,
        },
        () => {
          fetchStudentData(selectedStudent.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
          filter: `student_id=eq.${selectedStudent.id}`,
        },
        () => {
          fetchStudentData(selectedStudent.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudent, currentYear]);

  /* =========================
     FILTRO BUSCADOR
  ========================= */

  const filteredStudents = students.filter((s) =>
    `${s.full_name} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* =========================
     CÁLCULOS
  ========================= */

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return charges
      .filter((c) => c.status !== "PAGADO")
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  }, [charges]);

  const paidMonthsSet = useMemo(() => {
    return new Set(
      payments
        .filter((p) => p.month != null)
        .map((p) => Number(p.month))
    );
  }, [payments]);

  const monthsPaid = useMemo(() => {
    return paidMonthsSet.size;
  }, [paidMonthsSet]);

  const pendingMonths = useMemo(() => {
    const chargedMonths = new Set(
      charges
        .filter((c) => c.month != null)
        .map((c) => Number(c.month))
    );

    return [...chargedMonths].filter((m) => !paidMonthsSet.has(m)).length;
  }, [charges, paidMonthsSet]);

  const generalStatus =
    pendingMonths > 0 || enrollment?.status !== "PAGADO"
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
          <div className="border rounded mt-2 max-h-48 overflow-y-auto bg-white">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                className="p-2 hover:bg-muted cursor-pointer"
                onClick={async () => {
                  setSelectedStudent(s);
                  setSearch(s.full_name);
                  await fetchStudentData(s.id);
                }}
              >
                <p className="font-medium">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.grades?.name ?? "Sin grado"}
                  {s.sections?.name ? ` — Sección ${s.sections.name}` : ""}
                </p>
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
                {selectedStudent.guardians?.full_name ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>{" "}
                {selectedStudent.guardians?.phone ?? "—"}
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
                <span>Total: C$ {Number(enrollment.total_amount || 0).toLocaleString()}</span>
                <Badge
                  className={
                    enrollment.status === "PAGADO"
                      ? "bg-green-100 text-green-700"
                      : enrollment.status === "PARCIAL"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }
                >
                  {enrollment.status}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <span>Total: C$ 0</span>
                <Badge className="bg-red-100 text-red-700">
                  PENDIENTE
                </Badge>
              </div>
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
                    const monthNumber = i + 1;

                    const monthCharges = charges.filter(
                      (c) => Number(c.month) === monthNumber
                    );

                    const monthPayments = payments.filter(
                      (p) => Number(p.month) === monthNumber
                    );

                    const latestCharge =
                      monthCharges.length > 0
                        ? [...monthCharges].sort(
                          (a, b) =>
                            new Date(b.created_at || 0).getTime() -
                            new Date(a.created_at || 0).getTime()
                        )[0]
                        : null;

                    const latestPayment =
                      monthPayments.length > 0
                        ? [...monthPayments].sort(
                          (a, b) =>
                            new Date(b.paid_at || 0).getTime() -
                            new Date(a.paid_at || 0).getTime()
                        )[0]
                        : null;

                    const estadoMes = latestPayment
                      ? "Pagado"
                      : latestCharge?.status === "PARCIAL"
                        ? "Parcial"
                        : latestCharge
                          ? "Pendiente"
                          : "—";

                    const montoMes = latestPayment?.amount ?? latestCharge?.amount ?? 0;
                    const monedaMes = latestPayment?.currency ?? latestCharge?.currency ?? "NIO";

                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {m}
                        </TableCell>

                        <TableCell>
                          {latestCharge || latestPayment
                            ? `${monedaMes === "USD" ? "$" : "C$"} ${Number(montoMes).toLocaleString()}`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {latestPayment?.paid_at
                            ? new Date(latestPayment.paid_at).toLocaleDateString("es-NI")
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={
                              estadoMes === "Pagado"
                                ? "bg-green-100 text-green-700"
                                : estadoMes === "Parcial"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : estadoMes === "Pendiente"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }
                          >
                            {estadoMes}
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