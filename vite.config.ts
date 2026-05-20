import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + DOM bundled together — they always ship together.
          // Splitting them out means a TS-only change to argmap doesn't
          // invalidate the user's cached React on re-deploy.
          "vendor-react": ["react", "react-dom", "react-dom/client"],
          // React Flow / xyflow is heavy and only used inside the canvas
          // chunk. Splitting it out means the home page never pays its
          // parse cost.
          "vendor-xyflow": ["@xyflow/react"],
          // Supabase client is loaded at app boot but its surface is
          // mostly auth + RLS plumbing; splitting keeps the initial
          // parse smaller and improves cache hit rate.
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
