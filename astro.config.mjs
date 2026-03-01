// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import EntryShakingPlugin from "vite-plugin-entry-shaking";

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
  site: "https://govoterutherford.com",
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.GoVoteRutherford.com",
      },
    ],
  },

  // Disable CSRF origin check in production which can cause false positives
  // when the site is behind a reverse proxy (Nginx/Traefik/etc)
  security: {
    checkOrigin: false,
  },

  integrations: [],
  vite: {
    plugins: [
      tailwindcss(),
      EntryShakingPlugin({
        targets: ["@lucide/astro", "simple-icons-astro"],
      }),
    ],
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
