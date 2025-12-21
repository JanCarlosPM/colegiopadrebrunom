import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, CreditCard, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const studentData = {
  nombre: "María García López",
  matricula: "2024-0001",
  grado: "5to Grado A",
  tutor: "José García",
  telefono: "8888-1234",
  estado: "solvente",
};

const paymentHistory = [
  { mes: "Ene", pagado: 1500, pendiente: 0 },
  { mes: "Feb", pagado: 1500, pendiente: 0 },
  { mes: "Mar", pagado: 1500, pendiente: 0 },
  { mes: "Abr", pagado: 1500, pendiente: 0 },
  { mes: "May", pagado: 1500, pendiente: 0 },
  { mes: "Jun", pagado: 1500, pendiente: 0 },
  { mes: "Jul", pagado: 1500, pendiente: 0 },
  { mes: "Ago", pagado: 1500, pendiente: 0 },
  { mes: "Sep", pagado: 1500, pendiente: 0 },
  { mes: "Oct", pagado: 1500, pendiente: 0 },
  { mes: "Nov", pagado: 1500, pendiente: 0 },
  { mes: "Dic", pagado: 1500, pendiente: 0 },
];

const completedPayments = [
  { id: 1, concepto: "Mensualidad", mes: "Diciembre 2024", monto: 1500, metodo: "Efectivo", fecha: "2024-12-10" },
  { id: 2, concepto: "Mensualidad", mes: "Noviembre 2024", monto: 1500, metodo: "Transferencia", fecha: "2024-11-08" },
  { id: 3, concepto: "Mensualidad", mes: "Octubre 2024", monto: 1500, metodo: "POS", fecha: "2024-10-12" },
  { id: 4, concepto: "Matrícula", mes: "2024", monto: 3000, metodo: "Efectivo", fecha: "2024-01-15" },
];

const pendingPayments = [
  { id: 1, concepto: "Mensualidad", mes: "Enero 2025", monto: 1500, vence: "2025-01-10" },
  { id: 2, concepto: "Mensualidad", mes: "Febrero 2025", monto: 1500, vence: "2025-02-10" },
];

const Historial = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      title="Historial Financiero"
      subtitle="Detalle de pagos del estudiante"
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4 -ml-2"
        onClick={() => navigate("/estudiantes")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Estudiantes
      </Button>

      {/* Student Info Card */}
      <div className="metric-card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">MG</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {studentData.nombre}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>#{studentData.matricula}</span>
                <span>•</span>
                <span>{studentData.grado}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    studentData.estado === "solvente"
                      ? "badge-success"
                      : "badge-destructive"
                  )}
                >
                  {studentData.estado === "solvente" ? "Solvente" : "Moroso"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{studentData.tutor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{studentData.telefono}</span>
            </div>
            <Button size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Pago Rápido
            </Button>
          </div>
        </div>
      </div>

      {/* Charts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Payment Chart */}
        <div className="lg:col-span-2 metric-card h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Historial de Pagos 2024</h3>
            <Select defaultValue="2024">
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={paymentHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `C$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`C$${value.toLocaleString()}`]}
              />
              <Bar dataKey="pagado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Pagado" />
              <Bar dataKey="pendiente" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Pendiente" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Total Pagado 2024</p>
            <p className="text-2xl font-bold text-success mt-1">C$21,000</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Pendiente</p>
            <p className="text-2xl font-bold text-warning mt-1">C$3,000</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Meses Pagados</p>
            <p className="text-2xl font-bold text-foreground mt-1">12 / 12</p>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Mensualidades Pendientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="metric-card flex items-center justify-between border-l-4 border-l-warning"
              >
                <div>
                  <p className="font-medium text-foreground">{payment.concepto}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.mes} • Vence: {new Date(payment.vence).toLocaleDateString("es-NI")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">C${payment.monto.toLocaleString()}</p>
                  <Button size="sm" variant="outline" className="mt-1">
                    Pagar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Payments Table */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Pagos Completados</h3>
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Concepto</TableHead>
                <TableHead className="font-semibold">Mes</TableHead>
                <TableHead className="font-semibold">Monto</TableHead>
                <TableHead className="font-semibold">Método</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/30">
                  <TableCell>{payment.concepto}</TableCell>
                  <TableCell>{payment.mes}</TableCell>
                  <TableCell className="font-semibold">
                    C${payment.monto.toLocaleString()}
                  </TableCell>
                  <TableCell>{payment.metodo}</TableCell>
                  <TableCell>
                    {new Date(payment.fecha).toLocaleDateString("es-NI")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Historial;