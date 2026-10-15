import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import prisma from "../../../../lib/prisma";
import { encryptCredentials } from "../../../../lib/services/searchAnalytics/credentials";
import { env } from "../../../../lib/utils/environment";
import { SearchAnalyticsProvider } from "../../../../generated/prisma/client";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const stateCookie = cookies.get("search-analytics-google-state")?.value;
  const receivedState = url.searchParams.get("state") ?? "";
  cookies.delete("search-analytics-google-state", {
    path: "/admin/analytics/google",
  });

  if (
    !stateCookie ||
    stateCookie.length !== receivedState.length ||
    !timingSafeEqual(Buffer.from(stateCookie), Buffer.from(receivedState))
  ) {
    return new Response("Invalid Google authorization state", { status: 400 });
  }
  if (url.searchParams.has("error")) {
    return redirect("/admin/analytics?google=denied");
  }

  const code = url.searchParams.get("code");
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  if (!code || !clientId || !clientSecret) {
    return new Response("Google authorization could not be completed", {
      status: 400,
    });
  }

  const baseUrl = (env("PUBLIC_SITE_URL") || url.origin).replace(/\/$/, "");
  const oauth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/admin/analytics/google/callback`,
  );

  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      return new Response(
        "Google did not return a refresh token. Revoke the existing app grant and reconnect.",
        { status: 400 },
      );
    }
    oauth.setCredentials(tokens);
    const userInfo = await google.oauth2({ version: "v2", auth: oauth }).userinfo.get();
    const accountLabel = userInfo.data.email;
    if (!accountLabel) {
      return new Response("Google did not return an account email", {
        status: 400,
      });
    }

    await prisma.searchAnalyticsConnection.upsert({
      where: { provider: SearchAnalyticsProvider.GOOGLE_SEARCH_CONSOLE },
      create: {
        provider: SearchAnalyticsProvider.GOOGLE_SEARCH_CONSOLE,
        accountLabel,
        encryptedCredentials: encryptCredentials({
          refreshToken: tokens.refresh_token,
        }),
      },
      update: {
        accountLabel,
        encryptedCredentials: encryptCredentials({
          refreshToken: tokens.refresh_token,
        }),
        lastSyncError: null,
      },
    });
    return redirect("/admin/analytics?google=connected");
  } catch (error) {
    console.error("Search Console authorization failed", error);
    return new Response("Could not connect Google Search Console", {
      status: 502,
    });
  }
};
