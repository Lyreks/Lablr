import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Proxy backend paths so both share an origin (Caddy does the same under Docker). The Host header
// is kept, so the OAuth redirect URI points back at this server.
const backend = "http://localhost:8080";

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
