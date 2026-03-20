import type { APIRoute } from "astro";
import { app } from "../../../firebase/server";
import { getAuth } from "firebase-admin/auth";
import prisma from "../../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const auth = getAuth(app);

  /* Get token from request headers */
  const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];
  if (!idToken) {
    return new Response("No token found", { status: 401 });
  }

  /* Verify id token */
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return new Response("Invalid token", { status: 401 });
  }

  const { email, name } = decodedToken;

  if (email) {
    try {
      /* Check if user exists in database */
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        /* Auto-register the user */
        const firstName = name?.split(" ")[0] || email.split("@")[0] || "User";
        const lastName = name?.split(" ").slice(1).join(" ") || "";
        const username = email.split("@")[0] || email;

        await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            username,
            userTypeId: 1, // Default to admin (ID 1)
          },
        });
        console.log(`Auto-registered user: ${email}`);
      }
    } catch (dbError) {
      console.error("Database error during auto-registration:", dbError);
      // We still want to let them in if Firebase auth worked, or maybe not?
      // Usually, if we require the user record, we should error.
      // But auto-registration failing might just be a transitory issue.
      // To be safe, we'll log it and continue, or should we return an error?
      // If the app relies on the Prisma user, it's better to error.
      return new Response("Failed to register user", { status: 500 });
    }
  }

  /* Create and set session cookie */
  const fiveDays = 60 * 60 * 24 * 5 * 1000;
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: fiveDays,
  });

  cookies.set("__session", sessionCookie, {
    path: "/",
  });

  return redirect("/admin/elections");
};
