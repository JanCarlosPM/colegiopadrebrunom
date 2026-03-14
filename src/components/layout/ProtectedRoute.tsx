import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const isExpired = (s: any) => {
      const expiresAt = Number(s?.expires_at ?? 0);
      if (!expiresAt) return false;
      // margen de seguridad de 10 segundos
      return expiresAt <= Math.floor(Date.now() / 1000) + 10;
    };

    supabase.auth.getSession().then(({ data }) => {
      if (isExpired(data.session)) {
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isExpired(session)) {
          setSession(null);
          return;
        }
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Verificando sesión...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
