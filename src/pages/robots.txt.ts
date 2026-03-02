import type { APIRoute } from "astro";

const robots = `
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://govoterutherford.com/sitemap.xml
`.trim();

export const GET: APIRoute = () => {
  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
