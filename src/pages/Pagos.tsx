import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Receipt, Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const payments = [
  {
    id: 1,
    estudiante: "María García López",
    grado: "5to Grado A",
    concepto: "Mensualidad",
    mes: "Diciembre 2024",
    monto: 1500,
    metodo: "Efectivo",
    fecha: "2024-12-10",
    estado: "completado",
  },
  {
    id: 2,
    estudiante: "Carlos Martínez Ruiz",
    grado: "3er Grado B",
    concepto: "Matrícula",
    mes: "2025",
    monto: 3000,
    metodo: "Transferencia",
    fecha: "2024-12-10",
    estado: "completado",
  },
  {
    id: 3,
    estudiante: "Ana Sofía Hernández",
    grado: "1er Grado A",
    concepto: "Mensualidad",
    mes: "Diciembre 2024",
    monto: 1500,
    metodo: "POS",
    fecha: "2024-12-10",
    estado: "completado",
  },
  {
    id: 4,
    estudiante: "Luis Fernando Pérez",
    grado: "6to Grado A",
    concepto: "Mensualidad",
    mes: "Noviembre 2024",
    monto: 1500,
    metodo: "Pocket Lafise",
    fecha: "2024-12-09",
    estado: "completado",
  },
  {
    id: 5,
    estudiante: "Sofia Elena Castro",
    grado: "2do Grado B",
    concepto: "Otros",
    mes: "-",
    monto: 500,
    metodo: "Efectivo",
    fecha: "2024-12-08",
    estado: "completado",
  },
];

const methodColors: Record<string, string> = {
  Efectivo: "bg-success/10 text-success border-success/20",
  Transferencia: "bg-info/10 text-info border-info/20",
  POS: "bg-warning/10 text-warning border-warning/20",
  "Pocket Lafise": "bg-primary/10 text-primary border-primary/20",
};

const Pagos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.estudiante.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConcept =
      conceptFilter === "all" || payment.concepto === conceptFilter;
    const matchesMethod =
      methodFilter === "all" || payment.metodo === methodFilter;
    return matchesSearch && matchesConcept && matchesMethod;
  });

  return (
    <DashboardLayout
      title="Pagos"
      subtitle="Gestión de pagos y transacciones"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pagos Hoy</p>
          <p className="text-2xl font-bold text-foreground mt-1">24</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Recaudado Hoy</p>
          <p className="text-2xl font-bold text-success mt-1">C$36,000</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pendiente del Mes</p>
          <p className="text-2xl font-bold text-warning mt-1">C$87,000</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Meta Mensual</p>
          <p className="text-2xl font-bold text-foreground mt-1">72%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={conceptFilter} onValueChange={setConceptFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Concepto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Mensualidad">Mensualidad</SelectItem>
              <SelectItem value="Matrícula">Matrícula</SelectItem>
              <SelectItem value="Otros">Otros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Efectivo">Efectivo</SelectItem>
              <SelectItem value="Transferencia">Transferencia</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
              <SelectItem value="Pocket Lafise">Pocket Lafise</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Diciembre 2024
          </Button>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-4">
              <div>
                <label className="input-label">Estudiante</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">María García López - 5to A</SelectItem>
                    <SelectItem value="2">Carlos Martínez - 3er B</SelectItem>
                    <SelectItem value="3">Ana Sofía Hernández - 1er A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Concepto</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensualidad">Mensualidad</SelectItem>
                      <SelectItem value="matricula">Matrícula</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="input-label">Mes</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dic">Diciembre 2024</SelectItem>
                      <SelectItem value="ene">Enero 2025</SelectItem>
                      <SelectItem value="feb">Febrero 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Monto (C$)</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <label className="input-label">Método de Pago</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                      <SelectItem value="pocket">Pocket Lafise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="input-label">Fecha</label>
                <Input type="date" defaultValue="2024-12-12" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline">Cancelar</Button>
                <Button>Registrar Pago</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Estudiante</TableHead>
              <TableHead className="font-semibold">Concepto</TableHead>
              <TableHead className="font-semibold">Mes</TableHead>
              <TableHead className="font-semibold">Monto</TableHead>
              <TableHead className="font-semibold">Método</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.estudiante}</p>
                    <p className="text-xs text-muted-foreground">{payment.grado}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {payment.concepto}
                  </Badge>
                </TableCell>
                <TableCell>{payment.mes}</TableCell>
                <TableCell className="font-semibold">
                  C${payment.monto.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(methodColors[payment.metodo])}
                  >
                    {payment.metodo}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(payment.fecha).toLocaleDateString('es-NI')}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="badge-success capitalize">
                    {payment.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Receipt className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <p>Mostrando {filteredPayments.length} de {payments.length} pagos</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            1
          </Button>
          <Button variant="outline" size="sm">
            Siguiente
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Pagos;