import { defineConfig } from "vite";

// Bound to 0.0.0.0 so the sandbox preview proxy can reach it, and allowedHosts
// is open because the preview is served from a generated *.e2b.app hostname.
export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    // The preview proxy does not forward the Vite HMR websocket, so disable it
    // rather than leave the browser retrying a socket that will never connect.
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
