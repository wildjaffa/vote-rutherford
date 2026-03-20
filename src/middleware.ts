import { defineMiddleware, sequence } from "astro:middleware";
import { getSessionUser } from "./firebase/server";

const authentication = defineMiddleware(async (context, next) => {
  const pathName = context.url.pathname;
  // Check if the request is for an admin page
  if (
    (!pathName.startsWith("/admin") && !pathName.startsWith("/api/admin/")) ||
    pathName === "/admin/signin"
  ) {
    return next();
  }

  const session = context.cookies.get("__session");
  const user = await getSessionUser(session?.value);

  if (!user) {
    return context.redirect("/admin/signin");
  }

  return next();
});

// Implement better caching strategy for static assets and non-admin pages
const cacheControl = defineMiddleware(async (context, next) => {
  const response = await next();
  const pathName = context.url.pathname;

  // Cache for 4 hours (14400 seconds)
  if (!pathName.startsWith("/admin") && !pathName.startsWith("/api/admin/")) {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=14400, max-age=0, must-revalidate",
    );
    return response;
  }

  // Default to no-store for everything else, especially admin areas
  response.headers.set("Cache-Control", "no-store");
  return response;
});

export const onRequest = sequence(authentication, cacheControl);
