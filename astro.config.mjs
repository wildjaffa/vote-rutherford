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
  adapter: node({
    mode: "standalone",
  }),

  integrations: [
    icon({
      include: {
        lucide: ["*"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
