import type { APIRoute } from "astro";
import { google } from "googleapis";
import prisma from "../../../../lib/prisma";
import { getSessionUser } from "../../../../firebase/server";
import { env } from "../../../../lib/utils/environment";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Error from Google: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  const redirectUri = `${url.origin}/admin/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return new Response("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET", {
      status: 500,
    });
  }

  // Get current session user to link the account
  const sessionCookie = cookies.get("__session")?.value;
  const firebaseUser = await getSessionUser(sessionCookie);

  if (!firebaseUser?.email) {
    return new Response("Unauthorized or no email found in session", {
      status: 401,
    });
  }

  // Find the Prisma User by email
  const user = await prisma.user.findUnique({
    where: { email: firebaseUser.email },
  });

  if (!user) {
    return new Response("Prisma User not found for current session", {
      status: 404,
    });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the user's Google email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const googleEmail = userInfo.data.email;
    if (!googleEmail) {
      return new Response("Could not retrieve Google email", { status: 400 });
    }

    // We MUST have a refresh token for offline access to work long-term.
    // Since we used prompt='consent', it should be present.
    if (!tokens.refresh_token) {
      return new Response(
        "No refresh token received. Try fully disconnecting the app from your Google account and trying again.",
        { status: 400 },
      );
    }

    // Upsert UserGoogleAccount
    await prisma.userGoogleAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: googleEmail,
        },
      },
      update: {
        refreshToken: tokens.refresh_token,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        email: googleEmail,
        refreshToken: tokens.refresh_token,
      },
    });

    // Success! Redirect back to mass-email page
    return redirect(`/admin/candidates/mass-email?google_connected=true`);
  } catch (err) {
    console.error("Error setting up Google OAuth:", err);
    return new Response("Failed to authenticate with Google", { status: 500 });
  }
};
