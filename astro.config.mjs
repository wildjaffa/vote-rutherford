// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // Default 'static' output mode with adapter allows:
  // - Most pages prerendered at build time (default)
  // - Opt-out of prerendering with `export const prerender = false` on specific pages
  // - Server-side functionality (Astro actions, API routes) on demand
  output: "static",
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: "0.0.0.0",
    port: 4321,
  },

  integrations: [
    icon({
      include: {
        lucide: ["*"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.turbo/**",
          "*.db",
          "*.db-info",
          "*.db-shm",
          "*.db-wal",
        ],
      },
    },
  },
});
