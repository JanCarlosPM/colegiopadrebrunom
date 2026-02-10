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

const Dashboard = () => {
  const currentMonth = new Date().toLocaleString("es-NI", {
    month: "long",
  });

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema escolar"
    >
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Estudiantes"
          value="400"
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title="Estudiantes Matriculados"
          value="380"
          icon={UserCheck}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title="Estudiantes Solventes"
          value="320"
          icon={UserCheck}
          iconColor="text-info"
          iconBg="bg-info/10"
        />

        <MetricCard
          title="Morosos / Pendientes"
          value="60"
          icon={UserX}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title={`Ingresos de ${currentMonth}`}
          value="C$64,250"
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />

        <MetricCard
          title="Ingresos Mensualidades"
          value="C$52,000"
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />

        <MetricCard
          title="Ingresos Matrículas"
          value="C$12,250"
          icon={CreditCard}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />

        <MetricCard
          title="Pagos Hoy"
          value="18"
          icon={DollarSign}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      {/* Recent Payments */}
      <RecentPayments />
    </DashboardLayout>
  );
};

export default Dashboard;
