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
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().substring(0, 10);

  const currentMonth = new Date().toLocaleString("es-NI", {
    month: "long",
  });

  const firstDayMonth = new Date();
  firstDayMonth.setDate(1);
  const firstDayMonthISO = firstDayMonth.toISOString().substring(0, 10);

  /* ================= FETCH DASHBOARD DATA ================= */

  const { data } = useQuery({
    queryKey: ["dashboard", currentYear],
    queryFn: async () => {
      const [
        { count: totalStudents },
        { data: enrollments },
        { data: paymentsMonth },
        { data: paymentsAll },
        { count: paymentsToday },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("enrollments")
          .select("status")
          .eq("academic_year", currentYear),

        supabase
          .from("payments")
          .select("amount, concept")
          .gte("paid_at", firstDayMonthISO),

        supabase
          .from("payments")
          .select("amount, concept"),

        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("paid_at", today),
      ]);

      const matriculados = enrollments?.length ?? 0;

      const solventes =
        enrollments?.filter((e: any) => e.status === "PAGADO").length ?? 0;

      const morosos =
        enrollments?.filter((e: any) => e.status !== "PAGADO").length ?? 0;

      const ingresosMes =
        paymentsMonth?.reduce(
          (acc: number, p: any) => acc + Number(p.amount),
          0
        ) ?? 0;

      const ingresosMensualidades =
        paymentsAll
          ?.filter((p: any) => p.concept === "MENSUALIDAD")
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      const ingresosMatriculas =
        paymentsAll
          ?.filter((p: any) => p.concept === "MATRICULA")
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      return {
        totalStudents: totalStudents ?? 0,
        matriculados,
        solventes,
        morosos,
        ingresosMes,
        ingresosMensualidades,
        ingresosMatriculas,
        pagosHoy: paymentsToday ?? 0,
      };
    },
  });

  const stats = data ?? {
    totalStudents: 0,
    matriculados: 0,
    solventes: 0,
    morosos: 0,
    ingresosMes: 0,
    ingresosMensualidades: 0,
    ingresosMatriculas: 0,
    pagosHoy: 0,
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Estudiantes"
          value={stats.totalStudents}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title="Estudiantes Matriculados"
          value={stats.matriculados}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title="Estudiantes Solventes"
          value={stats.solventes}
          icon={UserCheck}
          iconColor="text-info"
          iconBg="bg-info/10"
        />

        <MetricCard
          title="Morosos / Pendientes"
          value={stats.morosos}
          icon={UserX}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title={`Ingresos de ${currentMonth}`}
          value={`C$${stats.ingresosMes.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title="Ingresos Mensualidades"
          value={`C$${stats.ingresosMensualidades.toLocaleString()}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title="Ingresos Matrículas"
          value={`C$${stats.ingresosMatriculas.toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title="Pagos Hoy"
          value={stats.pagosHoy}
          icon={DollarSign}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      <RecentPayments />
    </DashboardLayout>
  );
};

export default Dashboard;
