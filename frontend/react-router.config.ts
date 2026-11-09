import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: everything loads in the browser, and Caddy serves the build under Docker
  ssr: false,
} satisfies Config;
