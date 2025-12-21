import { useState } from "react";
import { GraduationCap, Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!username || !password) {
    toast.error("Ingrese usuario y contraseña");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: username,
    password,
  });

  if (error) {
    toast.error("Credenciales incorrectas");
    return;
  }

  navigate("/dashboard");
};


  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-elevated">
              <GraduationCap className="w-9 h-9 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center">
              Colegio Padre Bruno Martínez
            </h1>
            <p className="text-muted-foreground mt-1 text-center">
              Sistema Contable
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="input-label">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Recordar sesión
                </label>
              </div>
              <a
                href="#"
                className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
              >
                ¿Olvidó su contraseña?
              </a>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium">
              Ingresar
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © 2024 Colegio Padre Bruno Martínez. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/30" />
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <div className="w-24 h-24 bg-primary-foreground/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <GraduationCap className="w-14 h-14 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Bienvenido al Sistema Contable
          </h2>
          <p className="text-primary-foreground/80 max-w-sm text-lg">
            Gestiona matrículas, pagos y reportes financieros de manera eficiente y segura.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">400+</p>
              <p className="text-primary-foreground/70 text-sm">Estudiantes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">98%</p>
              <p className="text-primary-foreground/70 text-sm">Solvencia</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">12</p>
              <p className="text-primary-foreground/70 text-sm">Grados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;