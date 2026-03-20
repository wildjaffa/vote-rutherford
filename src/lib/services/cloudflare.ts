import { env } from "../utils/environment";

export async function purgeCloudflareCache(paths: string[]) {
  const zoneId = env("CLOUDFLARE_ZONE_ID");
  const apiToken = env("CLOUDFLARE_API_TOKEN");
  const siteUrl = env("PUBLIC_SITE_URL");

  if (!zoneId || !apiToken || !siteUrl) {
    console.warn(
      "Cloudflare cache purge skipped: Missing CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN, or PUBLIC_SITE_URL in environment.",
    );
    return;
  }

  // Ensure paths start with a slash and are mapped to the full site URL
  const urls = paths.map((path) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const cleanSiteUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${cleanSiteUrl}${cleanPath}`;
  });

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ files: urls }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(
        "Failed to purge Cloudflare cache:",
        response.status,
        errorData,
      );
    } else {
      console.log(
        `Successfully purged Cloudflare cache for ${urls.length} URLs.`,
      );
    }
  } catch (error) {
    console.error("Error purging Cloudflare cache:", error);
  }
}
