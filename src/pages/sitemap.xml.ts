import type { APIRoute } from "astro";
import prisma from "../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const baseUrl = context.site?.toString().replace(/\/$/, "") ?? "https://govoterutherford.com";

  // Fetch everything needed for the sitemap with election dates and archive status
  const [elections, races, candidates] = await Promise.all([
    prisma.election.findMany({
      where: { deletedAt: null },
      select: { slug: true, date: true, archivedAt: true, updatedAt: true },
    }),
    prisma.race.findMany({
      where: { deletedAt: null },
      select: {
        slug: true,
        updatedAt: true,
        election: { select: { slug: true, date: true, archivedAt: true } },
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
            election: { select: { slug: true, date: true, archivedAt: true } },
          },
        },
      },
    }),
  ]);

  const now = new Date();
  // Normalize today's date to midnight UTC/local start of day for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Determine current election based on today's date (on or after start of today)
  const isCurrentElection = (election: { date: Date }) => {
    return new Date(election.date) >= today;
  };

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
    <changefreq>${isCurrentElection(election) ? "weekly" : "monthly"}</changefreq>
    <priority>${isCurrentElection(election) ? "0.9" : "0.4"}</priority>
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
    <changefreq>${isCurrentElection(race.election) ? "weekly" : "monthly"}</changefreq>
    <priority>${isCurrentElection(race.election) ? "0.8" : "0.3"}</priority>
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
    <changefreq>${isCurrentElection(candidate.race.election) ? "weekly" : "monthly"}</changefreq>
    <priority>${isCurrentElection(candidate.race.election) ? "0.7" : "0.3"}</priority>
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
