import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: everything loads in the browser, and Spring Boot serves the build in the Docker image
  ssr: false,
} satisfies Config;
