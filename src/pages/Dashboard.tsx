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
          .select("student_id, amount, concept, month, currency")
          .eq("concept", "MENSUALIDAD")
          .eq("month", currentMonthNumber),

        supabase
          .from("payments")
          .select("amount, concept, academic_year, currency"),

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

      /* ================= INGRESOS POR MONEDA ================= */

      let matriculasNIO = 0;
      let matriculasUSD = 0;

      let mensualidadesNIO = 0;
      let mensualidadesUSD = 0;

      // MATRÍCULAS
      allPayments?.forEach((p: any) => {
        if (
          p.concept === "MATRICULA" &&
          p.academic_year === currentYear
        ) {
          if (p.currency === "USD") {
            matriculasUSD += Number(p.amount);
          } else {
            matriculasNIO += Number(p.amount);
          }
        }
      });

      // MENSUALIDADES
      monthlyPayments?.forEach((p: any) => {
        if (p.currency === "USD") {
          mensualidadesUSD += Number(p.amount);
        } else {
          mensualidadesNIO += Number(p.amount);
        }
      });

      return {
        totalStudents: totalStudents ?? 0,
        matriculados,
        solventes,
        pendientes,
        morosos,
        matriculasNIO,
        matriculasUSD,
        mensualidadesNIO,
        mensualidadesUSD,
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
    matriculasNIO: 0,
    matriculasUSD: 0,
    mensualidadesNIO: 0,
    mensualidadesUSD: 0,
    pagosMensualidadesHoy: 0,
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      {/* ================= ESTUDIANTES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      <div className="grid grid-cols-1 mb-6">
        <MetricCard
          title={`Morosos ${currentMonthName}`}
          value={stats.morosos}
          icon={UserX}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      {/* ================= INGRESOS POR MONEDA ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title={`Matrículas ${currentYear} (C$)`}
          value={`C$ ${(stats.matriculasNIO ?? 0).toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title={`Matrículas ${currentYear} ($)`}
          value={`$ ${(stats.matriculasUSD ?? 0).toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title={`Mensualidades ${currentMonthName} (C$)`}
          value={`C$ ${(stats.mensualidadesNIO ?? 0).toLocaleString()}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title={`Mensualidades ${currentMonthName} ($)`}
          value={`$ ${(stats.mensualidadesUSD ?? 0).toLocaleString()}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
      </div>

      {/* ================= PAGOS HOY ================= */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <MetricCard
          title="Pagos Mensualidades Hoy"
          value={stats.pagosMensualidadesHoy ?? 0}
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
