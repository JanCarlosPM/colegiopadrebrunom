import { useEffect } from "react";
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
  Percent,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Dashboard = () => {
  const qc = useQueryClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;
  const currentMonthName = now.toLocaleString("es-NI", { month: "long" });
  const todayISO = now.toISOString().substring(0, 10);

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
          .select("student_id, total_amount, paid_amount")
          .eq("academic_year", currentYear),

        supabase
          .from("payments")
          .select("student_id, amount, concept, month, currency, academic_year")
          .eq("concept", "MENSUALIDAD")
          .eq("month", currentMonthNumber)
          .eq("academic_year", currentYear),

        supabase
          .from("payments")
          .select("student_id, amount, concept, academic_year, currency"),

        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("concept", "MENSUALIDAD")
          .gte("paid_at", todayISO)
          .lte("paid_at", todayISO + "T23:59:59"),
      ]);

      const matriculados = enrollments?.length ?? 0;

      const paidStudentsThisMonth =
        monthlyPayments?.map((p: any) => p.student_id) ?? [];

      const solventes = paidStudentsThisMonth.length;
      const pendientes = matriculados - solventes;

      const lastDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

      const morosos =
        now.getDate() > lastDayOfMonth ? pendientes : 0;

      /* ======================
         PARCIALES
      ====================== */

      // MATRÍCULA PARCIAL
      const matriculaParcial =
        enrollments?.filter((e: any) => {
          const total = Number(e.total_amount);
          const paid = Number(e.paid_amount);

          return paid >= total * 0.5 && paid < total;
        }).length ?? 0;


      // MENSUALIDAD PARCIAL
      const mensualidadParcial =
        monthlyPayments
          ?.filter(
            (p: any) =>
              Number(p.amount) > 0 &&
              Number(p.amount) < 1000 // 👈 ajusta al monto real mensual
          ).length ?? 0;

      const matriculasNIO =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.academic_year === currentYear &&
              p.currency === "NIO"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      const matriculasUSD =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.academic_year === currentYear &&
              p.currency === "USD"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      const mensualidadesNIO =
        monthlyPayments
          ?.filter((p: any) => p.currency === "NIO")
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      const mensualidadesUSD =
        monthlyPayments
          ?.filter((p: any) => p.currency === "USD")
          .reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0;

      return {
        totalStudents: totalStudents ?? 0,
        matriculados,
        solventes,
        pendientes,
        morosos,
        matriculaParcial,
        mensualidadParcial,
        matriculasNIO,
        matriculasUSD,
        mensualidadesNIO,
        mensualidadesUSD,
        pagosMensualidadesHoy: paymentsTodayMonthly ?? 0,
      };
    },
  });

  const stats = {
    ...data,
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      {/* PRIMERA FILA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Estudiantes" value={stats?.totalStudents ?? 0} icon={Users} iconColor="text-primary" iconBg="bg-primary/10" />
        <MetricCard title={`Matriculados ${currentYear}`} value={stats?.matriculados ?? 0} icon={UserCheck} iconColor="text-success" iconBg="bg-success/10" />
        <MetricCard title={`Solventes ${currentMonthName}`} value={stats?.solventes ?? 0} icon={UserCheck} iconColor="text-info" iconBg="bg-info/10" />
        <MetricCard title={`Pendientes ${currentMonthName}`} value={stats?.pendientes ?? 0} icon={UserX} iconColor="text-warning" iconBg="bg-warning/10" />
      </div>

      {/* MOROSOS */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <MetricCard title={`Morosos ${currentMonthName}`} value={stats?.morosos ?? 0} icon={UserX} iconColor="text-destructive" iconBg="bg-destructive/10" />
      </div>

      {/* PARCIALES NUEVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title="Matrículas Parciales"
          value={stats?.matriculaParcial ?? 0}
          icon={Percent}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title="Mensualidades Parciales"
          value={stats?.mensualidadParcial ?? 0}
          icon={Percent}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      {/* INGRESOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title={`Matrículas ${currentYear}`}
          value={`C$${stats?.matriculasNIO?.toLocaleString() ?? 0} | $${stats?.matriculasUSD?.toLocaleString() ?? 0}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title={`Mensualidades ${currentMonthName}`}
          value={`C$${stats?.mensualidadesNIO?.toLocaleString() ?? 0} | $${stats?.mensualidadesUSD?.toLocaleString() ?? 0}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
      </div>

      {/* HOY */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <MetricCard
          title="Pagos Mensualidades Hoy"
          value={stats?.pagosMensualidadesHoy ?? 0}
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
