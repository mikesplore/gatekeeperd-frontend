import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/router";
import { useThemeStore } from "@/store/themeStore";
import { queryClient } from "@/lib/queryClient";
import { installChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import "./index.css";

installChunkLoadRecovery();

function ThemeBootstrap({ children }: { children: React.ReactNode }) {
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrap>
        <RouterProvider router={router} />
        <Toaster
            richColors
            closeButton
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "!min-h-0 !w-[min(22rem,calc(100vw-2rem))] !gap-2 !px-3 !py-2.5 text-sm",
                title: "text-sm font-medium",
                description: "text-xs",
                closeButton: "!h-5 !w-5",
              },
            }}
        />
      </ThemeBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
