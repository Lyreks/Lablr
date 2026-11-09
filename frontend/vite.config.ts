import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Proxy the backend so everything is same-origin (Caddy does this under Docker).
// changeOrigin must stay off so the Host header, and the OAuth redirect URI, stay on this server.
// The string shorthand turns it on.
const backend = { target: "http://localhost:8080", changeOrigin: false };

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api/": backend,
      "/oauth2/": backend,
      "/login/oauth2/": backend,
      "/logout": backend,
    },
  },
});
