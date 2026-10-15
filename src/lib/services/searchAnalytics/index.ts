import { google } from "googleapis";
import prisma from "../../prisma";
import { decryptCredentials } from "./credentials";
import { SearchAnalyticsProvider } from "../../../generated/prisma/client";
import type { SearchAnalyticsConnection } from "../../../generated/prisma/client";
import { env } from "../../utils/environment";

interface DailyMetric {
  date: Date;
  clicks: number;
  impressions: number;
  ctr: number | null;
  averagePosition: number | null;
}

interface GoogleCredentials {
  refreshToken: string;
}

interface BingCredentials {
  apiKey: string;
}

interface BingTrafficRow {
  Date?: string;
  Clicks?: number;
  Impressions?: number;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseBingDate(value: string | undefined): Date | null {
  if (!value) return null;
  const dotNetDate = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(value);
  if (dotNetDate) {
    const offsetText = dotNetDate[2] ?? "+0000";
    const offsetHours = Number(offsetText.slice(0, 3));
    const offsetMinutes = Number(offsetText.slice(3));
    const offset = Math.sign(offsetHours || 1) *
      (Math.abs(offsetHours) * 60 + offsetMinutes);
    return utcDate(dateString(new Date(Number(dotNetDate[1]) + offset * 60_000)));
  }

  const isoDate = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? utcDate(isoDate) : null;
}

function googleClient(refreshToken: string) {
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured");
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function listGoogleSearchConsoleSites(
  refreshToken: string,
): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const webmasters = google.webmasters({ version: "v3", auth: googleClient(refreshToken) });
  const response = await webmasters.sites.list();
  return (response.data.siteEntry ?? []).flatMap((site) =>
    site.siteUrl
      ? [{ siteUrl: site.siteUrl, permissionLevel: site.permissionLevel ?? "" }]
      : [],
  );
}

function recentRange(days: number, delayDays: number) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - delayDays);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: dateString(start), endDate: dateString(end) };
}

async function fetchGoogleDailyMetrics(
  connection: SearchAnalyticsConnection,
): Promise<DailyMetric[]> {
  if (!connection.siteUrl) {
    throw new Error("Choose a Google Search Console property before syncing");
  }
  const { refreshToken } = decryptCredentials<GoogleCredentials>(
    connection.encryptedCredentials,
  );
  const webmasters = google.webmasters({ version: "v3", auth: googleClient(refreshToken) });
  const { startDate, endDate } = recentRange(35, 3);
  const response = await webmasters.searchanalytics.query({
    siteUrl: connection.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date"],
      searchType: "web",
      aggregationType: "byProperty",
      rowLimit: 25000,
    },
  });

  return (response.data.rows ?? []).flatMap((row) => {
    const date = row.keys?.[0];
    if (!date) return [];
    return [{
      date: utcDate(date),
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? null,
      averagePosition: row.position ?? null,
    }];
  });
}

async function fetchBingDailyMetrics(
  connection: SearchAnalyticsConnection,
): Promise<DailyMetric[]> {
  if (!connection.siteUrl) {
    throw new Error("Enter a verified Bing Webmaster site URL before syncing");
  }
  const { apiKey } = decryptCredentials<BingCredentials>(
    connection.encryptedCredentials,
  );
  const url = new URL(
    "https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats",
  );
  url.searchParams.set("siteUrl", connection.siteUrl);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Bing Webmaster returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { d?: BingTrafficRow[] };
  const cutoff = recentRange(35, 1);
  return (payload.d ?? []).flatMap((row) => {
    const date = parseBingDate(row.Date);
    if (!date) return [];
    const day = dateString(date);
    if (day < cutoff.startDate || day > cutoff.endDate) return [];
    const clicks = Math.round(row.Clicks ?? 0);
    const impressions = Math.round(row.Impressions ?? 0);
    return [{
      date,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      averagePosition: null,
    }];
  });
}

export async function syncSearchAnalyticsConnection(
  connection: SearchAnalyticsConnection,
): Promise<number> {
  try {
    const metrics =
      connection.provider === SearchAnalyticsProvider.GOOGLE_SEARCH_CONSOLE
        ? await fetchGoogleDailyMetrics(connection)
        : await fetchBingDailyMetrics(connection);

    for (const metric of metrics) {
      await prisma.searchAnalyticsDailyMetric.upsert({
        where: {
          provider_date: {
            provider: connection.provider,
            date: metric.date,
          },
        },
        create: {
          ...metric,
          provider: connection.provider,
          connectionId: connection.id,
        },
        update: {
          ...metric,
          connectionId: connection.id,
        },
      });
    }

    await prisma.searchAnalyticsConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
    return metrics.length;
  } catch (error) {
    await prisma.searchAnalyticsConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncError:
          error instanceof Error ? error.message.slice(0, 500) : "Sync failed",
      },
    });
    throw error;
  }
}

export async function syncConnectedSearchAnalytics(): Promise<number> {
  const connections = await prisma.searchAnalyticsConnection.findMany();
  const results = await Promise.allSettled(
    connections.map((connection) => syncSearchAnalyticsConnection(connection)),
  );
  return results.reduce(
    (count, result) =>
      count + (result.status === "fulfilled" ? result.value : 0),
    0,
  );
}
