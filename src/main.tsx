import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { useRehydrateSession } from "@/hooks/useAuth";
import { router } from "@/router";
import { useAuthStore } from "@/store/authStore";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
    },
  },
});

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const email = useAuthStore((s) => s.email);
  const rehydrate = useRehydrateSession();

  useEffect(() => {
    if (token && !email) {
      rehydrate.mutate();
    }
  }, [token, email]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </SessionBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
