import type { APIRoute } from "astro";
import { google } from "googleapis";
import { env } from "../../../../lib/utils/environment";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET", {
      status: 500,
    });
  }

  const redirectUri = `${url.origin}/admin/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get a refresh token
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent", // Force consent to ensure we receive a refresh_token
  });

  return redirect(authUrl);
};
