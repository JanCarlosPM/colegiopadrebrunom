import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Download,
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
} from "lucide-react";

const reportTypes = [
  {
    id: "morosos",
    title: "Estudiantes Morosos",
    description: "Lista de estudiantes con pagos pendientes",
    icon: Users,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    id: "ingresos-mensuales",
    title: "Ingresos Mensuales",
    description: "Resumen de ingresos por mes",
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    id: "metodo-pago",
    title: "Ingresos por Método",
    description: "Desglose por forma de pago",
    icon: CreditCard,
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "historial-anual",
    title: "Historial General",
    description: "Reporte completo del año lectivo",
    icon: Calendar,
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const Reportes = () => {
  return (
    <DashboardLayout
      title="Reportes"
      subtitle="Generación de reportes financieros"
    >
      {/* Filters */}
      <div className="metric-card mb-6">
        <h3 className="font-semibold text-foreground mb-4">Filtros de Reporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="input-label">Mes</label>
            <Select defaultValue="diciembre">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                <SelectItem value="diciembre">Diciembre</SelectItem>
                <SelectItem value="noviembre">Noviembre</SelectItem>
                <SelectItem value="octubre">Octubre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="input-label">Grado</label>
            <Select defaultValue="todos">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los grados</SelectItem>
                <SelectItem value="1">1er Grado</SelectItem>
                <SelectItem value="2">2do Grado</SelectItem>
                <SelectItem value="3">3er Grado</SelectItem>
                <SelectItem value="4">4to Grado</SelectItem>
                <SelectItem value="5">5to Grado</SelectItem>
                <SelectItem value="6">6to Grado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="input-label">Estado</label>
            <Select defaultValue="todos">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="solvente">Solventes</SelectItem>
                <SelectItem value="moroso">Morosos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="input-label">Método de Pago</label>
            <Select defaultValue="todos">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="pocket">Pocket Lafise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <h3 className="font-semibold text-foreground mb-4">Tipos de Reportes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:shadow-elevated transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className={`p-3 rounded-lg ${report.bg}`}>
                <report.icon className={`h-6 w-6 ${report.color}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Options */}
      <div className="metric-card">
        <h3 className="font-semibold text-foreground mb-4">Exportar Datos</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar a PDF
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar a Excel
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Imprimir Reporte
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reportes;