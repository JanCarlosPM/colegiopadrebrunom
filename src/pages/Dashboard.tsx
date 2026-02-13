import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import {
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Calendar,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;

  const currentMonthName = now.toLocaleString("es-NI", {
    month: "long",
  });

  const todayISO = now.toISOString().substring(0, 10);

  /* ================= FETCH DASHBOARD DATA ================= */

  const { data } = useQuery({
    queryKey: ["dashboard", currentYear, currentMonthNumber],
    queryFn: async () => {
      const [
        { count: totalStudents },
        { data: enrollments },
        { data: monthlyPayments },
        { data: allPayments },
        { count: paymentsTodayMonthly },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("enrollments")
          .select("student_id, status")
          .eq("academic_year", currentYear),

        supabase
          .from("payments")
          .select("student_id, amount, concept, month")
          .eq("concept", "MENSUALIDAD")
          .eq("month", currentMonthNumber),

        supabase
          .from("payments")
          .select("amount, concept, academic_year"),

        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("concept", "MENSUALIDAD")
          .gte("paid_at", todayISO)
          .lte("paid_at", todayISO + "T23:59:59"),
      ]);

      const matriculados = enrollments?.length ?? 0;

      /* ================= SOLVENTES ================= */

      const paidStudentsThisMonth =
        monthlyPayments?.map((p: any) => p.student_id) ?? [];

      const solventes = paidStudentsThisMonth.length;

      const pendientes = matriculados - solventes;

      /* ================= MOROSOS ================= */

      const lastDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

      const morosos =
        now.getDate() > lastDayOfMonth ? pendientes : 0;

      /* ================= INGRESOS ================= */

      const ingresosMatriculas =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.academic_year === currentYear
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      const ingresosMensualidades =
        monthlyPayments?.reduce(
          (acc: number, p: any) => acc + Number(p.amount),
          0
        ) ?? 0;

      return {
        totalStudents: totalStudents ?? 0,
        matriculados,
        solventes,
        pendientes,
        morosos,
        ingresosMatriculas,
        ingresosMensualidades,
        pagosMensualidadesHoy: paymentsTodayMonthly ?? 0,
      };
    },
  });

  const stats = data ?? {
    totalStudents: 0,
    matriculados: 0,
    solventes: 0,
    pendientes: 0,
    morosos: 0,
    ingresosMatriculas: 0,
    ingresosMensualidades: 0,
    pagosMensualidadesHoy: 0,
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      {/* ================= ESTUDIANTES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Estudiantes"
          value={stats.totalStudents}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title={`Matriculados ${currentYear}`}
          value={stats.matriculados}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title={`Solventes ${currentMonthName}`}
          value={stats.solventes}
          icon={UserCheck}
          iconColor="text-info"
          iconBg="bg-info/10"
        />

        <MetricCard
          title={`Pendientes ${currentMonthName}`}
          value={stats.pendientes}
          icon={UserX}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      {/* ================= MOROSOS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 mb-6">
        <MetricCard
          title={`Morosos ${currentMonthName}`}
          value={stats.morosos}
          icon={UserX}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      {/* ================= INGRESOS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title={`Ingresos Matrículas ${currentYear}`}
          value={`C$${stats.ingresosMatriculas.toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title={`Ingresos Mensualidades ${currentMonthName}`}
          value={`C$${stats.ingresosMensualidades.toLocaleString()}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title="Pagos Mensualidades Hoy"
          value={stats.pagosMensualidadesHoy}
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
      </div>

      <RecentPayments />
    </DashboardLayout>
  );
};

export default Dashboard;
