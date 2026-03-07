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

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const Dashboard = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;
  const currentMonthName = MONTHS[currentMonthNumber - 1];

  const { data } = useQuery({
    queryKey: ["dashboard", currentYear, currentMonthNumber],
    queryFn: async () => {
      const [
        { count: totalStudents, error: studentsError },
        { data: enrollments, error: enrollmentsError },
        { data: monthlyPayments, error: monthlyPaymentsError },
        { data: monthlyCharges, error: monthlyChargesError },
        { data: allPendingCharges, error: allPendingChargesError },
        { data: allPayments, error: allPaymentsError },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("enrollments")
          .select("student_id, total_amount, paid_amount, status")
          .eq("academic_year", currentYear),

        supabase
          .from("payments")
          .select("student_id, amount, concept, month, currency, academic_year")
          .eq("concept", "MENSUALIDAD")
          .eq("month", currentMonthNumber)
          .eq("academic_year", currentYear),

        supabase
          .from("charges")
          .select("student_id, amount, currency, month, status, concept, academic_year")
          .eq("concept", "MENSUALIDAD")
          .eq("academic_year", currentYear)
          .eq("month", currentMonthNumber),

        supabase
          .from("charges")
          .select("student_id, amount, currency, month, status, concept, academic_year")
          .eq("concept", "MENSUALIDAD")
          .eq("academic_year", currentYear)
          .eq("status", "PENDIENTE"),

        supabase
          .from("payments")
          .select("student_id, amount, concept, academic_year, currency"),
      ]);

      if (studentsError) throw studentsError;
      if (enrollmentsError) throw enrollmentsError;
      if (monthlyPaymentsError) throw monthlyPaymentsError;
      if (monthlyChargesError) throw monthlyChargesError;
      if (allPendingChargesError) throw allPendingChargesError;
      if (allPaymentsError) throw allPaymentsError;

      const matriculados = enrollments?.length ?? 0;

      const paidStudentsThisMonth = new Set(
        (monthlyPayments ?? []).map((p: any) => p.student_id)
      );

      const solventes = paidStudentsThisMonth.size;
      const pendientes = Math.max(matriculados - solventes, 0);

      // Morosos del mes actual = estudiantes con charge pendiente del mes actual
      const morososMes = new Set(
        (monthlyCharges ?? [])
          .filter((c: any) => c.status === "PENDIENTE")
          .map((c: any) => c.student_id)
      ).size;

      // Pendiente total mensualidades = estudiantes con al menos una mensualidad pendiente
      const pendienteTotalMensualidades = new Set(
        (allPendingCharges ?? []).map((c: any) => c.student_id)
      ).size;

      const matriculaParcial =
        enrollments?.filter((e: any) => e.status === "PARCIAL").length ?? 0;

      const mensualidadParcial =
        (monthlyCharges ?? []).filter((c: any) => c.status === "PARCIAL").length ?? 0;

      const matriculasNIO =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.academic_year === currentYear &&
              p.currency === "NIO"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      const matriculasUSD =
        allPayments
          ?.filter(
            (p: any) =>
              p.concept === "MATRICULA" &&
              p.academic_year === currentYear &&
              p.currency === "USD"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      // Mensualidades del mes actual pagadas en C$
      const mensualidadesNIO =
        monthlyPayments
          ?.filter(
            (p: any) =>
              p.currency === "NIO" &&
              Number(p.month) === currentMonthNumber
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) ?? 0;

      // Mensualidades del mes actual pagadas en $
      const mensualidadesUSD =
        monthlyPayments
          ?.filter(
            (p: any) =>
              p.currency === "USD" &&
              Number(p.month) === currentMonthNumber
          )
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
      {/* PRIMERA FILA */}
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

      {/* SEGUNDA FILA */}
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

      {/* PARCIALES */}
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

      {/* INGRESOS */}
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