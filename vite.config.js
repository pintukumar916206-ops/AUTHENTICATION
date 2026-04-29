import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          )
            return "react";
          if (id.includes("node_modules/lucide-react")) return "lucide";
          if (id.includes("node_modules/@tanstack")) return "query";
          if (id.includes("node_modules/zustand")) return "vendor";
        },
      },
    },
    sourcemap: false,
    cssCodeSplit: true,
  },
});
