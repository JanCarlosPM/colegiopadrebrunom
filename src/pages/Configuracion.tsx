import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GraduationCap, Plus, Edit, Trash2, Save, Upload } from "lucide-react";

const users = [
  { id: 1, nombre: "Admin Principal", email: "admin@colegio.edu.ni", rol: "Administrador", estado: "activo" },
  { id: 2, nombre: "María López", email: "maria@colegio.edu.ni", rol: "Cobrador", estado: "activo" },
  { id: 3, nombre: "Carlos Ruiz", email: "carlos@colegio.edu.ni", rol: "Cobrador", estado: "inactivo" },
];

const Configuracion = () => {
  return (
    <DashboardLayout
      title="Configuración"
      subtitle="Ajustes del sistema contable"
    >
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* School Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Colegio</CardTitle>
                <CardDescription>Datos institucionales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="input-label">Nombre del Colegio</label>
                  <Input defaultValue="Colegio Padre Bruno Martínez" />
                </div>
                <div>
                  <label className="input-label">Dirección</label>
                  <Input defaultValue="Managua, Nicaragua" />
                </div>
                <div>
                  <label className="input-label">Teléfono</label>
                  <Input defaultValue="2222-3333" />
                </div>
                <div>
                  <label className="input-label">Correo Electrónico</label>
                  <Input defaultValue="info@colegiopbm.edu.ni" />
                </div>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logotipo</CardTitle>
                <CardDescription>Imagen institucional del colegio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-primary" />
                  </div>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar Logo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Academic Year */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Año Lectivo</CardTitle>
                <CardDescription>Configuración del período académico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="input-label">Año Lectivo Actual</label>
                  <Select defaultValue="2024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Matrículas Abiertas</p>
                    <p className="text-xs text-muted-foreground">Permitir nuevas matrículas</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notificaciones</CardTitle>
                <CardDescription>Configurar alertas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Alertas de Morosidad</p>
                    <p className="text-xs text-muted-foreground">Notificar estudiantes morosos</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Recordatorios de Pago</p>
                    <p className="text-xs text-muted-foreground">Enviar recordatorios automáticos</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Reportes Semanales</p>
                    <p className="text-xs text-muted-foreground">Recibir resumen semanal</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Gestión de Usuarios</CardTitle>
                <CardDescription>Administradores y cobradores del sistema</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    <div>
                      <label className="input-label">Nombre Completo</label>
                      <Input placeholder="Nombre del usuario" />
                    </div>
                    <div>
                      <label className="input-label">Correo Electrónico</label>
                      <Input type="email" placeholder="correo@colegio.edu.ni" />
                    </div>
                    <div>
                      <label className="input-label">Rol</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="cobrador">Cobrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="input-label">Contraseña</label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline">Cancelar</Button>
                      <Button>Crear Usuario</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold">Correo</TableHead>
                    <TableHead className="font-semibold">Rol</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{user.nombre}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.rol}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.estado === "activo" ? "badge-success" : "badge-warning"
                          }
                        >
                          {user.estado === "activo" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="precios">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mensualidades</CardTitle>
                <CardDescription>Configurar montos mensuales por grado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["1er Grado", "2do Grado", "3er Grado", "4to Grado", "5to Grado", "6to Grado"].map(
                  (grado) => (
                    <div key={grado} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{grado}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">C$</span>
                        <Input
                          type="number"
                          defaultValue="1500"
                          className="w-24 text-right"
                        />
                      </div>
                    </div>
                  )
                )}
                <Button className="w-full mt-4">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Precios
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Matrícula</CardTitle>
                <CardDescription>Configurar monto de matrícula</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="input-label">Monto de Matrícula General (C$)</label>
                  <Input type="number" defaultValue="3000" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Descuento por Hermanos</p>
                    <p className="text-xs text-muted-foreground">Aplicar 10% de descuento</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pronto Pago</p>
                    <p className="text-xs text-muted-foreground">5% descuento antes del 15</p>
                  </div>
                  <Switch />
                </div>
                <Button className="w-full mt-4">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Configuracion;