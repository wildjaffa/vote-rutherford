import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { env } from "../../../../lib/utils/environment";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return new Response("Google OAuth client credentials are not configured", {
      status: 500,
    });
  }

  const baseUrl = (env("PUBLIC_SITE_URL") || url.origin).replace(/\/$/, "");
  const redirectUri = `${baseUrl}/admin/analytics/google/callback`;
  const state = randomBytes(32).toString("base64url");
  cookies.set("search-analytics-google-state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/admin/analytics/google",
    maxAge: 600,
  });

  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
  return redirect(authUrl);
};
