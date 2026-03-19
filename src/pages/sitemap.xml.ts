import type { APIRoute } from "astro";
import prisma from "../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const baseUrl = context.site?.toString().replace(/\/$/, "") ?? "https://govoterutherford.com";

  // Fetch everything needed for the sitemap
  const [elections, races, candidates] = await Promise.all([
    prisma.election.findMany({
      where: { deletedAt: null, archivedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.race.findMany({
      where: { deletedAt: null },
      select: {
        slug: true,
        updatedAt: true,
        election: { select: { slug: true } },
      },
    }),
    prisma.candidate.findMany({
      where: { deletedAt: null },
      select: {
        slug: true,
        updatedAt: true,
        race: {
          select: {
            slug: true,
            election: { select: { slug: true } },
          },
        },
      },
    }),
  ]);

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "monthly" },
    { url: "/about", priority: "0.3", changefreq: "monthly" },
    { url: "/elections", priority: "0.9", changefreq: "monthly" },
    { url: "/my-ballot", priority: "0.8", changefreq: "monthly" },
    { url: "/how-it-works", priority: "0.3", changefreq: "monthly" },
    { url: "/contact", priority: "0.3", changefreq: "monthly" },
    { url: "/privacy-policy", priority: "0.3", changefreq: "monthly" },
    { url: "/terms-of-service", priority: "0.3", changefreq: "monthly" },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join("")}
  
  <!-- Elections -->
  ${elections
    .map(
      (election) => `
  <url>
    <loc>${baseUrl}/elections/${election.slug}</loc>
    <lastmod>${election.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("")}

  <!-- Races -->
  ${races
    .map(
      (race) => `
  <url>
    <loc>${baseUrl}/elections/${race.election.slug}/${race.slug}</loc>
    <lastmod>${race.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    )
    .join("")}

  <!-- Candidates -->
  ${candidates
    .map(
      (candidate) => `
  <url>
    <loc>${baseUrl}/elections/${candidate.race.election.slug}/${candidate.race.slug}/${candidate.slug}</loc>
    <lastmod>${candidate.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
};
