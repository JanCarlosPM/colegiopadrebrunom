import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type AuthErrorLike = {
  message?: string;
  details?: string;
  code?: string;
  status?: number;
};

const isJwtExpiredError = (error: unknown) => {
  const err = (error ?? {}) as AuthErrorLike;
  const raw = String(err.message || err.details || "").toLowerCase();
  return (
    raw.includes("jwt expired") ||
    err.code === "PGRST301" ||
    err.status === 401
  );
};

const forceRelogin = async () => {
  await supabase.auth.signOut();
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

/**
 * Cliente global con defaults de rendimiento y manejo de sesión expirada.
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isJwtExpiredError(error)) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (isJwtExpiredError(error)) {
          void forceRelogin();
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isJwtExpiredError(error)) {
          void forceRelogin();
        }
      },
    }),
  });
}
