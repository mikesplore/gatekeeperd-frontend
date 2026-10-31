import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: "/tmp/gatekeeperd-frontend-vite",
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (id.includes("/lucide-react/")) return "vendor-icons";
          if (id.includes("/@radix-ui/")) return "vendor-radix";
          if (id.includes("/@tanstack/")) return "vendor-query";
          if (id.includes("/react-router")) return "vendor-router";
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "vendor-react";
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
