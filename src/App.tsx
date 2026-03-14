import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Estudiantes = lazy(() => import("./pages/Estudiantes"));
const Matriculas = lazy(() => import("./pages/Matriculas"));
const Pagos = lazy(() => import("./pages/Pagos"));
const OtrosCobros = lazy(() => import("./pages/OtrosCobros"));
const Historial = lazy(() => import("./pages/Historial"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />

        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>}>
            <Routes>
            {/* PUBLIC */}
            <Route path="/login" element={<Login />} />

            {/* ROOT REDIRECT */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* PROTECTED */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/estudiantes"
              element={
                <ProtectedRoute>
                  <Estudiantes />
                </ProtectedRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/matriculas"
              element={
                <ProtectedRoute>
                  <Matriculas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/pagos"
              element={
                <ProtectedRoute>
                  <Pagos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/otros-cobros"
              element={
                <ProtectedRoute>
                  <OtrosCobros />
                </ProtectedRoute>
              }
            />

            <Route
              path="/historial"
              element={
                <ProtectedRoute>
                  <Historial />
                </ProtectedRoute>
              }
            />


            <Route
              path="/reportes"
              element={
                <ProtectedRoute>
                  <Reportes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuracion"
              element={
                <ProtectedRoute>
                  <Configuracion />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
