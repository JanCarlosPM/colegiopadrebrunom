import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, CheckCircle, AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import {
  MONTHS_ES,
  convertCurrency,
  formatMoney,
  normalizeCurrency,
} from "@/lib/billing";
import { StatusBadge } from "@/components/common/StatusBadge";

/* =========================
   CONSTANTE MESES
========================= */

/* =========================
   COMPONENT
========================= */

export default function Historial() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [enrollment, setEnrollment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);

  const [year, setYear] = useState(new Date().getFullYear());

  /* =========================
     FETCH STUDENTS
  ========================= */

  useEffect(() => {
    const fetchCurrentAcademicYear = async () => {
      const { data, error } = await supabase
        .from("school_settings")
        .select("current_academic_year")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.current_academic_year) {
        setYear(Number(data.current_academic_year));
      }
    };

    fetchCurrentAcademicYear();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
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
        setLoadingStudents(false);
        return;
      }

      setStudents(data || []);
      setLoadingStudents(false);
    };

    fetchStudents();
  }, []);

  /* =========================
     FETCH DATA
  ========================= */

  const fetchStudentData = async (studentId: string, academicYear: number) => {
    setLoadingHistory(true);
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("academic_year", academicYear)
      .maybeSingle();

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept", "MENSUALIDAD")
      .eq("academic_year", academicYear)
      .order("month", { ascending: true });

    const { data: chargesData, error: chargesError } = await supabase
      .from("charges")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept", "MENSUALIDAD")
      .eq("academic_year", academicYear)
      .order("month", { ascending: true });

    if (enrollmentError) console.error("Error enrollment:", enrollmentError);
    if (paymentsError) console.error("Error payments:", paymentsError);
    if (chargesError) console.error("Error charges:", chargesError);

    setEnrollment(enrollmentData || null);
    setPayments(paymentsData || []);
    setCharges(chargesData || []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (!selectedStudent) return;
    fetchStudentData(selectedStudent.id, year);
  }, [selectedStudent, year]);

  /* =========================
     REALTIME: ACTUALIZAR AL TOQUE
  ========================= */

  useEffect(() => {
    if (!selectedStudent) return;

    const channel = supabase
      .channel(`historial-${selectedStudent.id}-${year}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${selectedStudent.id}`,
        },
        () => {
          fetchStudentData(selectedStudent.id, year);
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
          fetchStudentData(selectedStudent.id, year);
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
          fetchStudentData(selectedStudent.id, year);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudent, year]);

  /* =========================
     FILTRO BUSCADOR
  ========================= */

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return students.filter((s) =>
      `${s.full_name} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [students, search]);

  /* =========================
     CÁLCULOS
  ========================= */

  const totalPaidByCurrency = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        const amount = Number(p.amount || 0);
        if ((p.currency ?? "NIO") === "USD") acc.usd += amount;
        else acc.nio += amount;
        return acc;
      },
      { nio: 0, usd: 0 }
    );
  }, [payments]);

  const monthlyRows = useMemo(() => {
    return MONTHS_ES.map((monthName, i) => {
      const monthNumber = i + 1;
      const monthCharges = charges.filter((c) => Number(c.month) === monthNumber);
      const monthPayments = payments.filter((p) => Number(p.month) === monthNumber);

      const latestPayment =
        monthPayments.length > 0
          ? [...monthPayments].sort(
              (a, b) =>
                new Date(b.paid_at || 0).getTime() -
                new Date(a.paid_at || 0).getTime()
            )[0]
          : null;

      const latestCharge =
        monthCharges.length > 0
          ? [...monthCharges].sort(
              (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
            )[0]
          : null;

      const chargeCurrency = normalizeCurrency(latestCharge?.currency ?? "NIO");
      const totalCharge = Number(latestCharge?.amount || 0);
      const paidNio = monthPayments
        .filter((p) => (p.currency ?? "NIO") === "NIO")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidUsd = monthPayments
        .filter((p) => (p.currency ?? "NIO") === "USD")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const paidInChargeCurrency =
        chargeCurrency === "USD"
          ? paidUsd + convertCurrency(paidNio, "NIO", "USD")
          : paidNio + convertCurrency(paidUsd, "USD", "NIO");

      const saldoChargeCurrency = Math.max(totalCharge - paidInChargeCurrency, 0);

      const totalChargeNio =
        totalCharge > 0
          ? chargeCurrency === "USD"
            ? convertCurrency(totalCharge, "USD", "NIO")
            : totalCharge
          : 0;

      const totalChargeUsd =
        totalCharge > 0
          ? chargeCurrency === "USD"
            ? totalCharge
            : convertCurrency(totalCharge, "NIO", "USD")
          : 0;

      const changeNio = monthPayments
        .filter((p) => (p.currency ?? "NIO") === "NIO")
        .reduce((sum, p) => sum + Number(p.change_amount || 0), 0);
      const changeUsd = monthPayments
        .filter((p) => (p.currency ?? "NIO") === "USD")
        .reduce((sum, p) => sum + Number(p.change_amount || 0), 0);

      let status = "Sin cargo";
      if (monthCharges.length > 0 && saldoChargeCurrency <= 0.01) status = "Pagado";
      else if (
        monthCharges.length > 0 &&
        (paidInChargeCurrency > 0.01 || monthPayments.length > 0)
      )
        status = "Parcial";
      else if (monthCharges.length > 0) status = "Pendiente";

      return {
        monthName,
        chargeCurrency,
        totalCharge,
        totalChargeNio,
        totalChargeUsd,
        paidNio,
        paidUsd,
        changeNio,
        changeUsd,
        saldoChargeCurrency,
        latestPaymentDate: latestPayment?.paid_at ?? null,
        status,
      };
    });
  }, [charges, payments]);

  const totalPendingByCurrency = useMemo(() => {
    return monthlyRows.reduce(
      (acc, row) => {
        if (row.status !== "Pendiente" && row.status !== "Parcial") return acc;
        if (row.chargeCurrency === "USD") {
          acc.usd += row.saldoChargeCurrency;
          acc.nio += convertCurrency(row.saldoChargeCurrency, "USD", "NIO");
        } else {
          acc.nio += row.saldoChargeCurrency;
          acc.usd += convertCurrency(row.saldoChargeCurrency, "NIO", "USD");
        }
        return acc;
      },
      { nio: 0, usd: 0 }
    );
  }, [monthlyRows]);

  const monthsPaid = useMemo(() => {
    return monthlyRows.filter((m) => m.status === "Pagado").length;
  }, [monthlyRows]);

  const pendingMonths = useMemo(() => {
    return monthlyRows.filter((m) => m.status === "Pendiente").length;
  }, [monthlyRows]);

  const partialMonths = useMemo(() => {
    return monthlyRows.filter((m) => m.status === "Parcial").length;
  }, [monthlyRows]);

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
      subtitle="Vista detallada de matrícula y mensualidades por estudiante"
    >
      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <Input
            placeholder="Buscar estudiante por nombre o grado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <div className="border rounded mt-2 max-h-56 overflow-y-auto bg-white">
              {loadingStudents ? (
                <p className="p-3 text-sm text-muted-foreground">Cargando estudiantes...</p>
              ) : filteredStudents.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No se encontraron estudiantes.</p>
              ) : (
                filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 hover:bg-muted cursor-pointer"
                    onClick={async () => {
                      setSelectedStudent(s);
                      setSearch(s.full_name);
                      await fetchStudentData(s.id, year);
                    }}
                  >
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.grades?.name ?? "Sin grado"}
                      {s.sections?.name ? ` — Sección ${s.sections.name}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Año lectivo</label>
          <Input
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))}
          />
        </div>
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

              <StatusBadge status={generalStatus} />
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
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fetchStudentData(selectedStudent.id, year)}
                disabled={loadingHistory}
              >
                <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
                Actualizar historial
              </Button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total Pagado"
              value={`C$ ${totalPaidByCurrency.nio.toLocaleString()} | $ ${totalPaidByCurrency.usd.toLocaleString()}`}
              icon={DollarSign}
              variant="success"
            />

            <StatsCard
              title="Saldo Pendiente"
              value={`C$ ${totalPendingByCurrency.nio.toLocaleString()} | $ ${totalPendingByCurrency.usd.toLocaleString()}`}
              icon={AlertTriangle}
              variant={
                totalPendingByCurrency.nio + totalPendingByCurrency.usd > 0
                  ? "destructive"
                  : "success"
              }
            />

            <StatsCard
              title="Meses Pagados"
              value={`${monthsPaid}/12`}
              icon={CheckCircle}
              variant="primary"
            />

            <StatsCard
              title="Pendientes / Parciales"
              value={`${pendingMonths} / ${partialMonths}`}
              icon={Calendar}
              variant={pendingMonths > 0 ? "warning" : "success"}
            />
          </div>

          {/* MATRÍCULA */}
          <div className="bg-card rounded-xl border shadow-sm p-5 mb-6">
            <h3 className="font-semibold mb-3">
              Matrícula {year}
            </h3>

            {enrollment ? (
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Total: {formatMoney(Number(enrollment.total_amount || 0), enrollment.currency)}
                </span>
                <span>
                  Pagado: {formatMoney(Number(enrollment.paid_amount || 0), enrollment.currency)}
                </span>
                <StatusBadge status={enrollment.status} />
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <span>Sin registro de matrícula para este año</span>
                <StatusBadge status="PENDIENTE" />
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
                    <TableHead>Total mensualidad</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Cambio</TableHead>
                    <TableHead>Fecha de pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {monthlyRows.map((row, i) => {
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {row.monthName}
                        </TableCell>

                        <TableCell>
                          {row.totalCharge > 0
                            ? `C$ ${Number(row.totalChargeNio).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} | $ ${Number(row.totalChargeUsd).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {row.paidNio > 0 || row.paidUsd > 0
                            ? `C$ ${Number(row.paidNio).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} | $ ${Number(row.paidUsd).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {row.changeNio > 0 || row.changeUsd > 0
                            ? `C$ ${Number(row.changeNio).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} | $ ${Number(row.changeUsd).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {row.latestPaymentDate
                            ? new Date(row.latestPaymentDate).toLocaleDateString("es-NI")
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={row.status === "Pagado" ? "PAGADO" : row.status === "Parcial" ? "PARCIAL" : row.status === "Pendiente" ? "PENDIENTE" : row.status}
                            label={row.status}
                          />
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

      {!selectedStudent && (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Selecciona un estudiante para ver su historial de matrícula y mensualidades.
        </div>
      )}
    </DashboardLayout>
  );
}