import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MorosityChart } from "@/components/dashboard/MorosityChart";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { Users, AlertTriangle, TrendingUp, CreditCard } from "lucide-react";

const Dashboard = () => {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Resumen general del sistema contable"
    >
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Estudiantes"
          value="400"
          change="+12 este mes"
          changeType="positive"
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <MetricCard
          title="Estudiantes Morosos"
          value="58"
          change="14.5% del total"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
        <MetricCard
          title="Ingresos del Mes"
          value="C$64,250"
          change="+8.2% vs mes anterior"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <MetricCard
          title="Pagos Hoy"
          value="24"
          change="C$36,000 recaudado"
          changeType="neutral"
          icon={CreditCard}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <MorosityChart />
        </div>
      </div>

      {/* Recent Payments */}
      <RecentPayments />
    </DashboardLayout>
  );
};

export default Dashboard;