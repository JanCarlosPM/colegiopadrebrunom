import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Estudiantes", href: "/estudiantes", icon: Users },
  { name: "Matrículas", href: "/matriculas", icon: GraduationCap },
  { name: "Mensualidades", href: "/pagos", icon: CreditCard },
  { name: "Historial", href: "/historial", icon: History },
  { name: "Reportes", href: "/reportes", icon: FileText },
  { name: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // 👈 agregado

  const handleLogout = async () => {
    await supabase.auth.signOut(); // 👈 cierra sesión en supabase
    navigate("/login"); // 👈 redirige al login
  };

  return (
    <aside
      className={cn(
      "h-screen sticky top-0 bg-sidebar flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-semibold text-sidebar-foreground text-sm leading-tight truncate">
                Colegio Padre Bruno
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Sistema Contable
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn("nav-item", isActive && "nav-item-active")}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-sidebar-foreground">
              AD
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Administrador
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                admin@colegio.edu.ni
              </p>
            </div>
          )}
        </div>

        {/* BOTÓN CERRAR SESIÓN */}
        <Button
          variant="ghost"
          onClick={handleLogout} // 👈 aquí
          className={cn(
            "w-full mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "px-0" : ""
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </div>
    </aside>
  );
}
