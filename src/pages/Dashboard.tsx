import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { MONTHS_ES } from "@/lib/billing";

const Dashboard = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;
  const currentMonthName = MONTHS_ES[currentMonthNumber - 1].toLowerCase();

  const yearStart = `${currentYear}-01-01T00:00:00`;
  const yearEnd = `${currentYear + 1}-01-01T00:00:00`;

  const { data } = useQuery({
    queryKey: ["dashboard", currentYear, currentMonthNumber],
    queryFn: async () => {
      const [
        { count: totalStudents, error: studentsError },
        { data: enrollments, error: enrollmentsError },
        { data: monthlyPayments, error: monthlyPaymentsError },
        { data: allMonthlyCharges, error: allMonthlyChargesError },
        { data: allPayments, error: allPaymentsError },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("enrollments")
          .select("student_id, total_amount, paid_amount, status")
          .eq("academic_year", currentYear),

        // Pagos de mensualidad del mes actual, usando paid_at para no perder pagos con academic_year nulo
        supabase
          .from("payments")
          .select("student_id, amount, concept, month, currency, paid_at")
          .eq("concept", "MENSUALIDAD")
          .eq("month", currentMonthNumber)
          .gte("paid_at", yearStart)
          .lt("paid_at", yearEnd),

        // Todos los charges de mensualidad del año actual
        supabase
          .from("charges")
          .select("student_id, amount, currency, month, status, concept, academic_year")
          .eq("concept", "MENSUALIDAD")
          .eq("academic_year", currentYear),

        // Todos los pagos del año actual
        supabase
          .from("payments")
          .select("student_id, amount, concept, currency, month, paid_at")
          .gte("paid_at", yearStart)
          .lt("paid_at", yearEnd),
      ]);

      if (studentsError) throw studentsError;
      if (enrollmentsError) throw enrollmentsError;
      if (monthlyPaymentsError) throw monthlyPaymentsError;
      if (allMonthlyChargesError) throw allMonthlyChargesError;
      if (allPaymentsError) throw allPaymentsError;

      const matriculados = enrollments?.length ?? 0;

      // ===== SOLVENTES / PENDIENTES DEL MES (fuente única: charges) =====
      const currentMonthCharges = (allMonthlyCharges ?? []).filter(
        (c: any) => Number(c.month) === currentMonthNumber
      );
      const solventes = new Set(
        currentMonthCharges
          .filter((c: any) => c.status === "PAGADO")
          .map((c: any) => c.student_id)
          .filter(Boolean)
      ).size;
      const pendientes = new Set(
        currentMonthCharges
          .filter((c: any) => c.status === "PENDIENTE" || c.status === "PARCIAL")
          .map((c: any) => c.student_id)
          .filter(Boolean)
      ).size;

      // Moroso mensual: tiene cargo del mes y no está PAGADO.
      const morososMes = pendientes;

      // ===== PENDIENTE TOTAL MENSUALIDADES =====
      const pendienteTotalMensualidades = new Set(
        (allMonthlyCharges ?? [])
          .filter((c: any) => c.status === "PENDIENTE" || c.status === "PARCIAL")
          .map((c: any) => c.student_id)
          .filter(Boolean)
      ).size;

      // ===== PARCIALES =====
      const matriculaParcial =
        enrollments?.filter((e: any) => e.status === "PARCIAL").length ?? 0;

      const mensualidadParcial =
        (allMonthlyCharges ?? []).filter((c: any) => c.status === "PARCIAL").length ?? 0;

      // ===== INGRESOS MATRÍCULAS =====
      const matriculasNIO =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.currency === "NIO"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      const matriculasUSD =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.currency === "USD"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      // ===== INGRESOS MENSUALIDADES DEL MES =====
      const mensualidadesNIO =
        monthlyPayments
          ?.filter((p: any) => p.currency === "NIO")
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      const mensualidadesUSD =
        monthlyPayments
          ?.filter((p: any) => p.currency === "USD")
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      return {
        totalStudents: totalStudents ?? 0,
        matriculados,
        solventes,
        pendientes,
        morososMes,
        pendienteTotalMensualidades,
        matriculaParcial,
        mensualidadParcial,
        matriculasNIO,
        matriculasUSD,
        mensualidadesNIO,
        mensualidadesUSD,
      };
    },
  });

  const stats = { ...data };

  const capitalize = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Estudiantes"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title={`Matriculados ${currentYear}`}
          value={stats?.matriculados ?? 0}
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title={`Solventes ${capitalize(currentMonthName)}`}
          value={stats?.solventes ?? 0}
          icon={UserCheck}
          iconColor="text-info"
          iconBg="bg-info/10"
        />

        <MetricCard
          title={`Pendientes ${capitalize(currentMonthName)}`}
          value={stats?.pendientes ?? 0}
          icon={UserX}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title={`Morosos ${capitalize(currentMonthName)}`}
          value={stats?.morososMes ?? 0}
          icon={UserX}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />

        <MetricCard
          title="Pendiente Total Mensualidades"
          value={stats?.pendienteTotalMensualidades ?? 0}
          icon={AlertTriangle}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title="Matrículas Parciales"
          value={stats?.matriculaParcial ?? 0}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title="Mensualidades Parciales"
          value={stats?.mensualidadParcial ?? 0}
          icon={Calendar}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title={`Matrículas ${currentYear}`}
          value={`C$${Number(stats?.matriculasNIO ?? 0).toLocaleString()} | $${Number(stats?.matriculasUSD ?? 0).toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title={`Mensualidades ${capitalize(currentMonthName)}`}
          value={`C$${Number(stats?.mensualidadesNIO ?? 0).toLocaleString()} | $${Number(stats?.mensualidadesUSD ?? 0).toLocaleString()}`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
      </div>

      <RecentPayments />
    </DashboardLayout>
  );
};

export default Dashboard;