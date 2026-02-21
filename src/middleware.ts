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

// TODO implement better caching strategy for static assets and non-admin pages
const cacheControl = defineMiddleware(async (_, next) => {
  const response = await next();
  response.headers.set("Cache-Control", "no-store");
  return response;
});

export const onRequest = sequence(authentication, cacheControl);
